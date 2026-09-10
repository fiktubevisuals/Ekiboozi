import React, { useState } from 'react';
import { HeartHandshake, Briefcase, ChevronRight, ExternalLink, MapPin, DollarSign, Building2, X, AlertCircle, CheckCircle2, User } from 'lucide-react';

import { User as FirebaseUser } from 'firebase/auth';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Campaign, Job, Creator } from '../types';

interface SupportViewProps {
  campaigns: Campaign[];
  jobs?: Job[];
  creators: Creator[];
  user: FirebaseUser | null;
  onNavigateToJobs?: () => void;
  onSelectJob: (job: Job) => void;
}

export const SupportView: React.FC<SupportViewProps> = ({ campaigns, jobs = [], creators, user, onNavigateToJobs, onSelectJob }) => {
  const [activeTab, setActiveTab] = useState<'financial' | 'jobs'>('financial');
  
  // Donation Modal State
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [donationAmount, setDonationAmount] = useState('20000');
  const [donorName, setDonorName] = useState('');
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [donationSuccessMsg, setDonationSuccessMsg] = useState<string | null>(null);
  
  // Start Campaign Modal State
  const [isStartCampaignOpen, setIsStartCampaignOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ title: '', description: '', target: '' });
  const [campaignImageFile, setCampaignImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCampaignImageFile(file);
    }
  };

  const handleSubmitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to start a campaign.");
      return;
    }
    if (!newCampaign.title || !newCampaign.description || !newCampaign.target || !campaignImageFile) {
      alert("Please fill out all fields and upload an image.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload the image to storage
      const ext = campaignImageFile.name.split('.').pop();
      const path = `campaigns/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, campaignImageFile);

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed',
          null,
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      // 2. Add document to firestore
      await addDoc(collection(db, 'campaigns'), {
        title: newCampaign.title,
        description: newCampaign.description,
        target: parseFloat(newCampaign.target),
        raised: 0,
        image: downloadUrl,
        organizer: user.displayName || user.email || 'Anonymous',
        creatorId: user.uid,
        status: 'pending',
        isFeatured: false,
        createdAt: serverTimestamp()
      });
      setIsStartCampaignOpen(false);
      setNewCampaign({ title: '', description: '', target: '' });
      setCampaignImageFile(null);
      alert("Campaign submitted successfully! It will be reviewed by admins.");
    } catch (error) {
      console.error('Error submitting campaign:', error);
      alert('Could not submit campaign. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatUGX = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !donationAmount) return;
    
    const amount = parseFloat(donationAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) return;

    setIsProcessing(true);
    try {
      // 1. Immediately record in Firestore and update the campaign progress bar
      const campaignRef = doc(db, 'campaigns', selectedCampaign.id);
      await updateDoc(campaignRef, {
        raised: increment(amount),
        donorsCount: increment(1),
      });

      // 2. Add donation transaction record
      await addDoc(collection(db, 'donations'), {
        campaignId: selectedCampaign.id,
        campaignTitle: selectedCampaign.title,
        amount: amount,
        currency: 'UGX',
        donorName: donorName.trim() || user?.displayName || 'Kind Supporter',
        donorEmail: user?.email || '',
        donorId: user?.uid || null,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
        status: 'completed',
      });

      // 3. Initiate payment processing (Pesapal) if configured
      try {
        const response = await fetch('/api/pesapal/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amount,
            description: `Donation to: ${selectedCampaign.title}`,
            reference: `DONATE-${Date.now()}`
          })
        });
        const data = await response.json();
        if (data.redirect_url) {
          window.open(data.redirect_url, '_blank');
        }
      } catch (gateErr) {
        console.warn('Payment gateway handoff notice:', gateErr);
      }

      setDonationSuccessMsg(`Thank you! Your donation of UGX ${formatUGX(amount)} has been successfully recorded and the campaign progress bar has been updated.`);
    } catch (error: any) {
      console.error('Donation error:', error);
      alert(`Could not record donation: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-8 md:py-12 animate-in fade-in duration-300">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-[32px] md:text-[40px] font-bold text-[#F3F1EA] tracking-tight mb-4">
          Community Support Hub
        </h1>
        <p className="text-[16px] text-[#9BA1A8] leading-relaxed">
          We believe in uplifting our creators and community members. Whether you need a stepping stone financially or are looking for your next career move, we are here to help.
        </p>
      </div>

      <div className="flex justify-center mb-10">
        <div className="bg-[#1D2126] p-1.5 rounded-full flex gap-2">
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[15px] font-medium transition-all ${
              activeTab === 'financial'
                ? 'bg-[#F2B705] text-[#14171A]'
                : 'text-[#F3F1EA] hover:bg-[#333A41]'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            Financial Support
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[15px] font-medium transition-all ${
              activeTab === 'jobs'
                ? 'bg-[#F2B705] text-[#14171A]'
                : 'text-[#F3F1EA] hover:bg-[#333A41]'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Job Opportunities
          </button>
        </div>
      </div>

      {activeTab === 'financial' && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[20px] font-bold text-[#F3F1EA]">Active Campaigns</h2>
            <button 
              onClick={() => setIsStartCampaignOpen(true)}
              className="text-[#F2B705] hover:text-[#F2B705]/80 text-[14px] font-medium transition-colors"
            >
              Start a Campaign
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.filter(c => c.status === 'approved').map((campaign) => {
              const progressPercentage = Math.min(100, Math.round((campaign.raised / campaign.target) * 100));
              
              return (
                <div key={campaign.id} className="bg-[#1D2126] border border-[#333A41] rounded-[24px] overflow-hidden flex flex-col hover:border-[#656C73] transition-colors group">
                  <div className="h-48 relative overflow-hidden">
                    <img 
                      src={campaign.image} 
                      alt={campaign.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1D2126] to-transparent opacity-80" />
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1 relative z-10 -mt-8">
                    <span className="text-[12px] font-bold text-[#F2B705] uppercase tracking-wider mb-2 drop-shadow-md">
                      By {campaign.organizer}
                    </span>
                    <h3 className="text-[18px] font-bold text-[#F3F1EA] mb-3 leading-snug">
                      {campaign.title}
                    </h3>
                    <p className="text-[#9BA1A8] text-[14px] leading-relaxed mb-6 line-clamp-3">
                      {campaign.description}
                    </p>
                    
                    <div className="mt-auto">
                      <div className="flex items-center justify-between text-[14px] mb-2">
                        <div>
                          <span className="font-bold text-[#F3F1EA]">UGX {formatUGX(campaign.raised)}</span>
                          <span className="text-[#9BA1A8] text-[12px] block">raised of UGX {formatUGX(campaign.target)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#F2B705] font-bold text-[14px]">{progressPercentage}%</span>
                          {campaign.donorsCount ? (
                            <span className="text-[#9BA1A8] text-[12px] block">{campaign.donorsCount} donation{campaign.donorsCount === 1 ? '' : 's'}</span>
                          ) : null}
                        </div>
                      </div>
                      
                      <div className="h-2.5 w-full bg-[#333A41] rounded-full overflow-hidden mb-6">
                        <div 
                          className="h-full bg-[#F2B705] rounded-full transition-all duration-700"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      
                      <button 
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setDonationAmount('20000');
                          setIsCustomAmount(false);
                        }}
                        className="w-full py-3.5 bg-white hover:bg-gray-100 text-[#14171A] text-[15px] font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <HeartHandshake className="w-5 h-5" />
                        Donate Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[20px] font-bold text-[#F3F1EA]">Latest Openings</h2>
            {onNavigateToJobs && (
              <button 
                onClick={onNavigateToJobs}
                className="text-[#F2B705] hover:text-[#F2B705]/80 text-[14px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                Go to Jobs Board <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {jobs.filter(j => j.status === 'approved').length === 0 ? (
            <div className="bg-[#1D2126] border border-[#333A41] rounded-[20px] p-8 text-center">
              <Briefcase className="w-10 h-10 text-[#9BA1A8] mx-auto mb-3" />
              <h3 className="text-[17px] font-bold text-[#F3F1EA] mb-1">No active job openings yet</h3>
              <p className="text-[14px] text-[#9BA1A8] mb-4 max-w-md mx-auto">
                Are you looking to hire talented videographers, editors, or creators in Uganda?
              </p>
              {onNavigateToJobs && (
                <button
                  onClick={onNavigateToJobs}
                  className="px-5 py-2.5 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] font-bold text-[14px] rounded-full transition-colors cursor-pointer"
                >
                  Post a Job Opening
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {jobs.filter(j => j.status === 'approved').map((job) => {
                const creator = creators.find(c => c.id === job.creatorId);
                return (
                  <div key={job.id} onClick={() => onSelectJob(job)} className="group bg-[#1D2126] border border-[#333A41] rounded-[20px] p-6 hover:border-[#656C73] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${creator?.avatarGradient || 'bg-gradient-to-br from-gray-500 to-gray-700'}`}>
                        {creator?.initials ? creator.initials : <User className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-[18px] font-bold text-[#F3F1EA] group-hover:text-[#F2B705] transition-colors mb-2">
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-[#9BA1A8]">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4" /> {job.company}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" /> {job.location}
                          </div>
                          {job.salary && (
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="w-4 h-4" /> {job.salary}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-[14px] text-[#9BA1A8] sm:text-right">
                      <p>Posted by {creator?.name || 'Community Member'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Donation Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-[#1D2126] border border-[#333A41] rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="h-32 relative">
              <img src={selectedCampaign.image} alt={selectedCampaign.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60" />
              <button 
                onClick={() => {
                  setSelectedCampaign(null);
                  setDonationSuccessMsg(null);
                }}
                className="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-md"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-4 left-5 right-5">
                <p className="text-white/80 text-[13px] font-medium mb-1">You are supporting:</p>
                <h3 className="text-white font-bold text-[18px] truncate">{selectedCampaign.title}</h3>
              </div>
            </div>
            
            {donationSuccessMsg ? (
              <div className="p-6 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-[#F2B705]/20 text-[#F2B705] mx-auto flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-[20px] font-bold text-[#F3F1EA] mb-2">Donation Recorded!</h3>
                <p className="text-[#9BA1A8] text-[14px] leading-relaxed mb-6">
                  {donationSuccessMsg}
                </p>
                <div className="bg-[#14171A] border border-[#333A41] rounded-xl p-4 mb-6 text-left">
                  <div className="flex justify-between items-center text-[13px] mb-1.5">
                    <span className="text-[#9BA1A8]">Campaign:</span>
                    <span className="text-[#F3F1EA] font-semibold truncate max-w-[200px]">{selectedCampaign.title}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px] mb-1.5">
                    <span className="text-[#9BA1A8]">New Total Raised:</span>
                    <span className="text-[#F2B705] font-bold">UGX {formatUGX(selectedCampaign.raised)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-[#9BA1A8]">Goal Progress:</span>
                    <span className="text-[#F3F1EA] font-semibold">
                      {Math.min(100, Math.round((selectedCampaign.raised / selectedCampaign.target) * 100))}%
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCampaign(null);
                    setDonationSuccessMsg(null);
                  }}
                  className="w-full py-3.5 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] text-[15px] font-bold rounded-xl transition-colors"
                >
                  Awesome, Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleDonate} className="p-6">
                <div className="mb-5">
                  <label className="block text-[#9BA1A8] text-[14px] font-medium mb-3">
                    Select Donation Amount
                  </label>
                  
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[10000, 20000, 50000, 100000, 200000].map(amount => (
                      <button
                        type="button"
                        key={amount}
                        onClick={() => { setDonationAmount(amount.toString()); setIsCustomAmount(false); }}
                        className={`py-2 rounded-xl text-[14px] font-bold border transition-colors ${donationAmount === amount.toString() && !isCustomAmount ? 'bg-[#F2B705] text-[#14171A] border-[#F2B705]' : 'bg-[#14171A] text-[#F3F1EA] border-[#333A41] hover:border-[#F2B705]/50'}`}
                      >
                        {amount.toLocaleString()}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setIsCustomAmount(true); setDonationAmount(''); }}
                      className={`py-2 rounded-xl text-[14px] font-bold border transition-colors ${isCustomAmount ? 'bg-[#F2B705] text-[#14171A] border-[#F2B705]' : 'bg-[#14171A] text-[#F3F1EA] border-[#333A41] hover:border-[#F2B705]/50'}`}
                    >
                      Custom
                    </button>
                  </div>

                  {isCustomAmount && (
                    <div className="relative animate-in fade-in slide-in-from-top-2 mb-3">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9BA1A8] font-bold">UGX</span>
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        required
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        disabled={isProcessing}
                        placeholder="Enter custom amount..."
                        className="w-full bg-[#14171A] border border-[#333A41] rounded-xl pl-14 pr-4 py-3.5 text-[16px] text-[#F3F1EA] font-semibold outline-none focus:border-[#F2B705] transition-colors"
                      />
                    </div>
                  )}
                </div>

                <div className="mb-5">
                  <label className="block text-[#9BA1A8] text-[13px] font-medium mb-1.5">
                    Your Name or Handle (Optional)
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    disabled={isProcessing}
                    placeholder={user?.displayName || "Kind Supporter"}
                    className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-4 py-2.5 text-[14px] text-[#F3F1EA] outline-none focus:border-[#F2B705] transition-colors"
                  />
                </div>
                
                <div className="flex items-start gap-3 bg-[#F2B705]/10 border border-[#F2B705]/20 rounded-xl p-4 mb-6">
                  <AlertCircle className="w-5 h-5 text-[#F2B705] flex-shrink-0 mt-0.5" />
                  <p className="text-[13px] text-[#F3F1EA]/90 leading-relaxed">
                    100% of your donation is recorded live on the campaign goal. Secure checkout handoff is supported via Pesapal.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCampaign(null);
                      setDonationSuccessMsg(null);
                    }}
                    disabled={isProcessing}
                    className="flex-1 py-3.5 bg-[#333A41] hover:bg-[#434A51] text-[#F3F1EA] text-[15px] font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || !donationAmount}
                    className="flex-[2] py-3.5 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] text-[15px] font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? 'Recording...' : `Confirm & Donate UGX ${donationAmount ? formatUGX(parseFloat(donationAmount.replace(/,/g, '')) || 0) : '0'}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Start Campaign Modal */}
      {isStartCampaignOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#1D2126] border border-[#333A41] rounded-[24px] shadow-2xl p-6 md:p-8 my-8 relative">
            <button 
              onClick={() => setIsStartCampaignOpen(false)}
              className="absolute top-6 right-6 text-[#9BA1A8] hover:text-[#F3F1EA] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-[24px] font-bold text-[#F3F1EA] mb-2">Start a Campaign</h2>
            <p className="text-[#9BA1A8] mb-8">Tell us about your cause. All campaigns are reviewed by our community team before going live.</p>

            <form onSubmit={handleSubmitCampaign} className="space-y-6">
              <div>
                <label className="block text-[#F3F1EA] font-medium mb-2">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={newCampaign.title}
                  onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                  className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-4 py-3 text-[#F3F1EA] outline-none focus:border-[#F2B705] transition-colors"
                  placeholder="e.g. Studio Equipment Fund"
                />
              </div>

              <div>
                <label className="block text-[#F3F1EA] font-medium mb-2">Description</label>
                <textarea
                  required
                  rows={4}
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-4 py-3 text-[#F3F1EA] outline-none focus:border-[#F2B705] transition-colors resize-none"
                  placeholder="Explain why you are raising funds and how they will be used..."
                />
              </div>

              <div>
                <label className="block text-[#F3F1EA] font-medium mb-2">Target Amount (UGX)</label>
                <input
                  type="number"
                  min="10000"
                  step="1000"
                  required
                  value={newCampaign.target}
                  onChange={(e) => setNewCampaign({ ...newCampaign, target: e.target.value })}
                  className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-4 py-3 text-[#F3F1EA] outline-none focus:border-[#F2B705] transition-colors"
                  placeholder="e.g. 5000000"
                />
              </div>

              <div>
                <label className="block text-[#F3F1EA] font-medium mb-2">Campaign Image</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    required={!campaignImageFile}
                    className="block w-full text-sm text-[#9BA1A8] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#F2B705] file:text-[#14171A] hover:file:bg-[#F2B705]/90 file:transition-colors file:cursor-pointer"
                  />
                </div>
                {campaignImageFile && (
                  <div className="mt-4 h-40 rounded-xl overflow-hidden border border-[#333A41]">
                    <img src={URL.createObjectURL(campaignImageFile)} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStartCampaignOpen(false)}
                  className="px-6 py-3 text-[#F3F1EA] font-medium hover:bg-[#333A41] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-[#F2B705] text-[#14171A] font-bold rounded-xl hover:bg-[#F2B705]/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
