import React, { useState, useRef } from 'react';
import { Video, Creator, HeroCarouselItem, Campaign, Job, FooterSettings, TermsSettings } from '../types';
import { Trash2, Users, Film, Activity, AlertTriangle, Edit2, X, Plus, UploadCloud, Image as ImageIcon, HeartHandshake, CheckCircle, Star, Layers } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { deleteDoc, doc, updateDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { CATEGORIES } from '../constants';
import { AdminFooterTermsTab } from './AdminFooterTermsTab';

interface AdminDashboardProps {
  videos: Video[];
  creators: Creator[];
  heroItems: HeroCarouselItem[];
  campaigns: Campaign[];
  jobs: Job[];
  footerSettings?: FooterSettings;
  termsSettings?: TermsSettings;
  onDeleteVideo: (videoId: string) => Promise<void>;
  onDeleteCreator: (creatorId: string) => Promise<void>;
  onWipeDatabase: () => Promise<void>;
  onUpdateFooterSettings?: (settings: FooterSettings) => Promise<void>;
  onUpdateTermsSettings?: (settings: TermsSettings) => Promise<void>;
  onNavigateToTerms?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  videos,
  creators,
  heroItems,
  campaigns,
  jobs,
  footerSettings,
  termsSettings,
  onDeleteVideo,
  onDeleteCreator,
  onWipeDatabase,
  onUpdateFooterSettings,
  onUpdateTermsSettings,
  onNavigateToTerms,
}) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'users' | 'hero' | 'campaigns' | 'jobs' | 'footer_terms'>('videos');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isWiping, setIsWiping] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Hero Item form state
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [editingHeroItem, setEditingHeroItem] = useState<HeroCarouselItem | null>(null);
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroLinkedVideo, setHeroLinkedVideo] = useState('');
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroUploadProgress, setHeroUploadProgress] = useState(0);
  const [isSavingHero, setIsSavingHero] = useState(false);

  // Add Campaign form state
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDesc, setCampaignDesc] = useState('');
  const [campaignTarget, setCampaignTarget] = useState('');
  const [campaignFile, setCampaignFile] = useState<File | null>(null);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalViews = videos.reduce((acc, v) => acc + v.viewsCount, 0);
  const totalLikes = videos.reduce((acc, v) => acc + (v.likes || 0), 0);

  const handleDelete = async (videoId: string) => {
    // if (!window.confirm("Are you sure you want to delete this video? This cannot be undone.")) return;
    setIsDeleting(videoId);
    try {
      await onDeleteVideo(videoId);
    } catch (e) {
      console.error("AdminDashboard: Error in onDeleteVideo:", e);
      alert("Failed to delete video.");
    }
    setIsDeleting(null);
  };

  const [isDeletingCreator, setIsDeletingCreator] = useState<string | null>(null);
  const handleDeleteCreatorClick = async (creatorId: string) => {
    if (!window.confirm("Are you sure you want to delete this creator? This cannot be undone.")) return;
    setIsDeletingCreator(creatorId);
    try {
      await onDeleteCreator(creatorId);
    } catch (e) {
      console.error(e);
      alert("Failed to delete creator.");
    }
    setIsDeletingCreator(null);
  };

  const handleEditClick = (v: Video) => {
    setEditingVideo(v);
    setEditTitle(v.title);
    setEditDesc(v.description || '');
    setEditCategory(v.category);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'videos', editingVideo.id), {
        title: editTitle,
        description: editDesc,
        category: editCategory
      });
      setEditingVideo(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update video');
    }
    setIsUpdating(false);
  };

  const handleWipeDatabase = async () => {
    if (!window.confirm("DANGER: This will delete ALL videos and creators from the platform. Are you absolutely sure?")) return;
    setIsWiping(true);
    try {
      await onWipeDatabase();
      alert("Database wiped successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to wipe database.");
    }
    setIsWiping(false);
  };

  const openHeroModal = (item?: HeroCarouselItem) => {
    if (item) {
      setEditingHeroItem(item);
      setHeroTitle(item.title);
      setHeroSubtitle(item.subtitle);
      setHeroLinkedVideo(item.linkedVideoId || '');
    } else {
      setEditingHeroItem(null);
      setHeroTitle('');
      setHeroSubtitle('');
      setHeroLinkedVideo('');
    }
    setHeroFile(null);
    setHeroUploadProgress(0);
    setIsHeroModalOpen(true);
  };

  const handleDeleteHeroItem = async (id: string) => {
    if (!window.confirm('Delete this hero item?')) return;
    try {
      await deleteDoc(doc(db, 'hero_items', id));
    } catch (e) {
      alert('Failed to delete item');
    }
  };

  const handleSaveHeroItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroTitle) return;
    
    setIsSavingHero(true);
    let mediaUrl = editingHeroItem?.mediaUrl || '';
    let mediaType = editingHeroItem?.mediaType || 'image';

    try {
      if (heroFile) {
        // Upload new file
        const ext = heroFile.name.split('.').pop();
        const path = `hero/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, heroFile);

        mediaUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snap) => {
              setHeroUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100);
            },
            reject,
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
        mediaType = heroFile.type.startsWith('video') ? 'video' : 'image';
      }

      if (!mediaUrl) {
        alert("Please select a media file.");
        setIsSavingHero(false);
        return;
      }

      const itemData: any = {
        title: heroTitle,
        subtitle: heroSubtitle,
        mediaUrl,
        mediaType,
      };
      if (heroLinkedVideo) {
        itemData.linkedVideoId = heroLinkedVideo;
        const linkedVideo = videos.find(v => v.id === heroLinkedVideo);
        if (linkedVideo?.thumbnailUrl) {
          itemData.posterUrl = linkedVideo.thumbnailUrl;
        }
      }

      if (editingHeroItem) {
        await updateDoc(doc(db, 'hero_items', editingHeroItem.id), itemData);
      } else {
        itemData.id = `hero_${Date.now()}`;
        itemData.createdAt = new Date().toISOString();
        await setDoc(doc(db, 'hero_items', itemData.id), itemData);
      }
      setIsHeroModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save hero item');
    }
    setIsSavingHero(false);
  };

  const openCampaignModal = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setCampaignTitle(campaign.title);
      setCampaignDesc(campaign.description);
      setCampaignTarget(campaign.target.toString());
    } else {
      setEditingCampaign(null);
      setCampaignTitle('');
      setCampaignDesc('');
      setCampaignTarget('');
    }
    setCampaignFile(null);
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle || !campaignDesc || !campaignTarget) {
      alert("Please fill in all text fields.");
      return;
    }
    
    if (!editingCampaign && !campaignFile) {
      alert("Please provide an image for new campaigns.");
      return;
    }
    
    setIsSavingCampaign(true);
    try {
      let downloadUrl = editingCampaign?.image || '';

      // Upload new image if provided
      if (campaignFile) {
        const ext = campaignFile.name.split('.').pop();
        const path = `campaigns/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, campaignFile);

        downloadUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed',
            null,
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
      }

      if (editingCampaign) {
        // Update existing campaign
        await updateDoc(doc(db, 'campaigns', editingCampaign.id), {
          title: campaignTitle,
          description: campaignDesc,
          target: parseFloat(campaignTarget),
          image: downloadUrl
        });
      } else {
        // Save to firestore with status 'approved' since admin is adding it
        await addDoc(collection(db, 'campaigns'), {
          title: campaignTitle,
          description: campaignDesc,
          target: parseFloat(campaignTarget),
          raised: 0,
          image: downloadUrl,
          organizer: 'Admin',
          creatorId: 'admin',
          status: 'approved',
          isFeatured: false,
          createdAt: serverTimestamp()
        });
      }
      setIsCampaignModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save campaign');
    }
    setIsSavingCampaign(false);
  };

  const handleJobAction = async (jobId: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!window.confirm("Are you sure you want to delete this job posting?")) return;
        await deleteDoc(doc(db, 'jobs', jobId));
      } else if (action === 'approve') {
        await updateDoc(doc(db, 'jobs', jobId), { status: 'approved' });
      } else if (action === 'reject') {
        await updateDoc(doc(db, 'jobs', jobId), { status: 'pending' });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update job status');
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'approve' | 'reject' | 'delete' | 'toggleFeature') => {
    try {
      if (action === 'delete') {
        if (!window.confirm("Are you sure you want to delete this campaign?")) return;
        await deleteDoc(doc(db, 'campaigns', campaignId));
      } else if (action === 'approve') {
        await updateDoc(doc(db, 'campaigns', campaignId), { status: 'approved' });
      } else if (action === 'reject') {
        await updateDoc(doc(db, 'campaigns', campaignId), { status: 'pending', isFeatured: false });
      } else if (action === 'toggleFeature') {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (campaign) {
          await updateDoc(doc(db, 'campaigns', campaignId), { isFeatured: !campaign.isFeatured });
        }
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action} campaign.`);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-8 animate-in fade-in">
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleUpdateSubmit} className="bg-[#14171A] border border-[#333A41] rounded-[24px] p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#F3F1EA]">Edit Video</h3>
              <button type="button" onClick={() => setEditingVideo(null)} className="text-[#9BA1A8] hover:text-[#F3F1EA]"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">Title</label>
                <input required value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-2.5 text-[14px] text-[#F3F1EA] outline-none focus:border-[#F2B705]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">Description</label>
                <textarea rows={3} value={editDesc} onChange={e=>setEditDesc(e.target.value)} className="w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-2.5 text-[14px] text-[#F3F1EA] outline-none focus:border-[#F2B705] resize-none" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">Category</label>
                <select value={editCategory} onChange={e=>setEditCategory(e.target.value)} className="w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-2.5 text-[14px] text-[#F3F1EA] outline-none focus:border-[#F2B705]">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingVideo(null)} className="px-5 py-2 text-[#9BA1A8] font-medium hover:text-[#F3F1EA]">Cancel</button>
              <button type="submit" disabled={isUpdating} className="px-6 py-2 bg-[#F2B705] text-black font-bold rounded-full hover:brightness-110 disabled:opacity-50">
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isHeroModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <form onSubmit={handleSaveHeroItem} className="bg-[#14171A] border border-[#333A41] rounded-[24px] p-6 w-full max-w-md shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#F3F1EA]">{editingHeroItem ? 'Edit Hero Item' : 'New Hero Item'}</h3>
              <button type="button" onClick={() => setIsHeroModalOpen(false)} className="text-[#9BA1A8] hover:text-[#F3F1EA]"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">Title</label>
                <input required value={heroTitle} onChange={e=>setHeroTitle(e.target.value)} className="w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-2.5 text-[14px] text-[#F3F1EA] outline-none focus:border-[#F2B705]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">Subtitle (Channel or Info)</label>
                <input required value={heroSubtitle} onChange={e=>setHeroSubtitle(e.target.value)} className="w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-2.5 text-[14px] text-[#F3F1EA] outline-none focus:border-[#F2B705]" />
              </div>
              
              <div>
                <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">Linked Video ID (Optional)</label>
                <select value={heroLinkedVideo} onChange={e=>setHeroLinkedVideo(e.target.value)} className="w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-2.5 text-[14px] text-[#F3F1EA] outline-none focus:border-[#F2B705]">
                  <option value="">None (Display only)</option>
                  {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">Media (Image, GIF, Video)</label>
                <input 
                  type="file" 
                  accept="image/*,video/mp4,video/webm" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setHeroFile(e.target.files[0]);
                    }
                  }}
                />
                
                {heroFile ? (
                  <div className="flex items-center justify-between bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-3">
                    <span className="text-[13px] text-[#F3F1EA] truncate flex-1">{heroFile.name}</span>
                    <button type="button" onClick={() => setHeroFile(null)} className="text-[#E14545] p-1"><X className="w-4 h-4" /></button>
                  </div>
                ) : editingHeroItem ? (
                  <div className="flex flex-col gap-3">
                    <div className="bg-[#1D2126] border border-[#333A41] rounded-[12px] p-2 aspect-video relative overflow-hidden flex items-center justify-center">
                      {editingHeroItem.mediaType === 'video' ? (
                        <video src={editingHeroItem.mediaUrl} className="w-full h-full object-cover rounded-[8px]" />
                      ) : (
                        <img src={editingHeroItem.mediaUrl} className="w-full h-full object-cover rounded-[8px]" alt="preview" />
                      )}
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[13px] text-[#F2B705] font-medium">Replace media</button>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-[100px] border-2 border-dashed border-[#333A41] hover:border-[#F2B705] rounded-[12px] flex flex-col items-center justify-center gap-2 transition-colors group"
                  >
                    <UploadCloud className="w-6 h-6 text-[#9BA1A8] group-hover:text-[#F2B705]" />
                    <span className="text-[13px] text-[#9BA1A8] group-hover:text-[#F2B705]">Click to upload</span>
                  </button>
                )}
                {heroUploadProgress > 0 && heroUploadProgress < 100 && (
                  <div className="mt-2 h-1 bg-[#1D2126] rounded-full overflow-hidden">
                    <div className="h-full bg-[#F2B705] transition-all" style={{ width: `${heroUploadProgress}%` }} />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setIsHeroModalOpen(false)} className="px-5 py-2 text-[#9BA1A8] font-medium hover:text-[#F3F1EA]">Cancel</button>
              <button type="submit" disabled={isSavingHero} className="px-6 py-2 bg-[#F2B705] text-black font-bold rounded-full hover:brightness-110 disabled:opacity-50">
                {isSavingHero ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add/Edit Campaign Modal */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <form onSubmit={handleSaveCampaign} className="bg-[#14171A] border border-[#333A41] rounded-[24px] p-6 w-full max-w-md shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#F3F1EA]">{editingCampaign ? 'Edit Campaign' : 'Add Fundraising Campaign'}</h3>
              <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="text-[#9BA1A8] hover:text-[#F3F1EA]"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">Campaign Title</label>
                <input required value={campaignTitle} onChange={e=>setCampaignTitle(e.target.value)} className="w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-2.5 text-[14px] text-[#F3F1EA] outline-none focus:border-[#F2B705]" placeholder="e.g. Save the Lions" />
              </div>
              
              <div>
                <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">Description</label>
                <textarea required rows={3} value={campaignDesc} onChange={e=>setCampaignDesc(e.target.value)} className="w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-2.5 text-[14px] text-[#F3F1EA] outline-none focus:border-[#F2B705] resize-none" placeholder="Provide details..." />
              </div>
              
              <div>
                <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">Target Amount (UGX)</label>
                <input type="number" required min="1000" step="1000" value={campaignTarget} onChange={e=>setCampaignTarget(e.target.value)} className="w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-2.5 text-[14px] text-[#F3F1EA] outline-none focus:border-[#F2B705]" placeholder="e.g. 5000000" />
              </div>
              
              <div>
                <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">Campaign Image {editingCampaign && '(Optional: Leave empty to keep current)'}</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  required={!editingCampaign}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCampaignFile(e.target.files[0]);
                    }
                  }} 
                  className="w-full text-[13px] text-[#9BA1A8] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[13px] file:font-semibold file:bg-[#F2B705] file:text-black hover:file:bg-[#F2B705]/90 file:cursor-pointer cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="px-5 py-2 text-[#9BA1A8] font-medium hover:text-[#F3F1EA]">Cancel</button>
              <button type="submit" disabled={isSavingCampaign} className="px-6 py-2 bg-[#F2B705] text-black font-bold rounded-full hover:brightness-110 disabled:opacity-50">
                {isSavingCampaign ? 'Saving...' : editingCampaign ? 'Save Changes' : 'Add Campaign'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#E14545]/15 flex items-center justify-center text-[#E14545]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-[#F3F1EA] leading-none mb-1">Admin Dashboard</h1>
            <p className="text-[14px] text-[#9BA1A8]">Platform management and moderation</p>
          </div>
        </div>
        <button 
          onClick={handleWipeDatabase}
          disabled={isWiping}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#E14545]/10 text-[#E14545] font-semibold rounded-full border border-[#E14545]/20 hover:bg-[#E14545]/20 transition-colors disabled:opacity-50"
        >
          {isWiping ? (
            <>
              <div className="w-4 h-4 border-2 border-[#E14545] border-t-transparent rounded-full animate-spin" />
              Wiping...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Wipe All Content
            </>
          )}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-[#1D2126] border border-[#333A41] rounded-[16px] p-5">
          <div className="text-[#9BA1A8] text-[13px] font-semibold mb-1 flex items-center gap-2">
            <Film className="w-4 h-4" /> Total Videos
          </div>
          <div className="text-[28px] font-bold text-[#F3F1EA]">{videos.length}</div>
        </div>
        <div className="bg-[#1D2126] border border-[#333A41] rounded-[16px] p-5">
          <div className="text-[#9BA1A8] text-[13px] font-semibold mb-1 flex items-center gap-2">
            <Users className="w-4 h-4" /> Creators
          </div>
          <div className="text-[28px] font-bold text-[#F3F1EA]">{creators.length}</div>
        </div>
        <div className="bg-[#1D2126] border border-[#333A41] rounded-[16px] p-5">
          <div className="text-[#9BA1A8] text-[13px] font-semibold mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Total Views
          </div>
          <div className="text-[28px] font-bold text-[#F3F1EA]">{totalViews.toLocaleString()}</div>
        </div>
        <div className="bg-[#1D2126] border border-[#333A41] rounded-[16px] p-5">
          <div className="text-[#9BA1A8] text-[13px] font-semibold mb-1 flex items-center gap-2">
            <HeartHandshake className="w-4 h-4" /> Campaigns
          </div>
          <div className="text-[28px] font-bold text-[#F3F1EA]">{campaigns.length}</div>
        </div>
        <div className="bg-[#1D2126] border border-[#333A41] rounded-[16px] p-5">
          <div className="text-[#9BA1A8] text-[13px] font-semibold mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Total Likes
          </div>
          <div className="text-[28px] font-bold text-[#F3F1EA]">{totalLikes.toLocaleString()}</div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-[#1D2126] border border-[#333A41] rounded-[20px] overflow-hidden">
        <div className="flex border-b border-[#333A41] overflow-x-auto">
          <button 
            onClick={() => setActiveTab('videos')}
            className={`px-6 py-4 text-[14px] font-semibold transition-colors whitespace-nowrap ${activeTab === 'videos' ? 'text-[#F2B705] border-b-2 border-[#F2B705]' : 'text-[#9BA1A8] hover:text-[#F3F1EA]'}`}
          >
            Video Moderation
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-4 text-[14px] font-semibold transition-colors whitespace-nowrap ${activeTab === 'users' ? 'text-[#F2B705] border-b-2 border-[#F2B705]' : 'text-[#9BA1A8] hover:text-[#F3F1EA]'}`}
          >
            Manage Users
          </button>
          <button 
            onClick={() => setActiveTab('hero')}
            className={`px-6 py-4 text-[14px] font-semibold transition-colors whitespace-nowrap ${activeTab === 'hero' ? 'text-[#F2B705] border-b-2 border-[#F2B705]' : 'text-[#9BA1A8] hover:text-[#F3F1EA]'}`}
          >
            Hero Carousel
          </button>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={`px-6 py-4 text-[14px] font-semibold transition-colors whitespace-nowrap ${activeTab === 'campaigns' ? 'text-[#F2B705] border-b-2 border-[#F2B705]' : 'text-[#9BA1A8] hover:text-[#F3F1EA]'}`}
          >
            Fundraising Campaigns
          </button>
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`px-6 py-4 text-[14px] font-semibold transition-colors whitespace-nowrap ${activeTab === 'jobs' ? 'text-[#F2B705] border-b-2 border-[#F2B705]' : 'text-[#9BA1A8] hover:text-[#F3F1EA]'}`}
          >
            Job Postings
          </button>
          <button 
            onClick={() => setActiveTab('footer_terms')}
            className={`px-6 py-4 text-[14px] font-semibold transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'footer_terms' ? 'text-[#F2B705] border-b-2 border-[#F2B705]' : 'text-[#9BA1A8] hover:text-[#F3F1EA]'}`}
            id="admin-tab-footer-terms"
          >
            <Layers className="w-4 h-4" />
            <span>Footer & Legal Terms</span>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'hero' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[#F3F1EA] font-semibold">Hero Carousel Items</h2>
                <button onClick={() => openHeroModal()} className="flex items-center gap-2 bg-[#F2B705] text-[#14171A] px-4 py-2 rounded-full font-semibold hover:brightness-110 transition-all">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {heroItems.map(item => (
                  <div key={item.id} className="bg-[#14171A] border border-[#333A41] rounded-[16px] overflow-hidden group">
                    <div className="aspect-[16/9] relative bg-[#1D2126]">
                      {item.mediaType === 'video' ? (
                        <video src={item.mediaUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={item.mediaUrl} className="w-full h-full object-cover" alt={item.title} />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={() => openHeroModal(item)} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur-md transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteHeroItem(item.id)} className="w-10 h-10 rounded-full bg-[#E14545]/80 hover:bg-[#E14545] flex items-center justify-center text-white backdrop-blur-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                        {item.mediaType}
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="text-[#F3F1EA] font-bold text-[15px] truncate mb-1">{item.title}</h4>
                      <p className="text-[#9BA1A8] text-[13px] truncate">{item.subtitle}</p>
                      {item.linkedVideoId && (
                        <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#21A8A3]">
                          <Film className="w-3.5 h-3.5" />
                          <span className="truncate">Linked to video</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {heroItems.length === 0 && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-[#333A41] rounded-[16px]">
                    <ImageIcon className="w-8 h-8 text-[#9BA1A8] mx-auto mb-3 opacity-50" />
                    <p className="text-[#F3F1EA] font-medium mb-1">No hero items yet</p>
                    <p className="text-[#9BA1A8] text-[13px] mb-4">Upload images or short videos for the carousel</p>
                    <button onClick={() => openHeroModal()} className="text-[#F2B705] font-semibold text-[14px]">Create first item</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[#9BA1A8] text-[12px] uppercase tracking-wider border-b border-[#333A41]">
                    <th className="pb-3 px-4 font-semibold">Video</th>
                    <th className="pb-3 px-4 font-semibold">Creator</th>
                    <th className="pb-3 px-4 font-semibold">Stats</th>
                    <th className="pb-3 px-4 font-semibold">Date</th>
                    <th className="pb-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#9BA1A8] text-[14px]">No videos found.</td>
                    </tr>
                  )}
                  {videos.map(v => (
                    <tr key={v.id} className="border-b border-[#333A41]/50 hover:bg-[#333A41]/20 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-[8px] flex-shrink-0 bg-gradient-to-br ${v.thumbnailGradient} overflow-hidden`}>
                            {v.thumbnailUrl && <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />}
                          </div>
                          <div className="max-w-[240px]">
                            <p className="text-[#F3F1EA] text-[14px] font-medium truncate">{v.title}</p>
                            <p className="text-[#9BA1A8] text-[12px] truncate">{v.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#F3F1EA] text-[14px]">{v.channel}</td>
                      <td className="py-4 px-4 text-[13px]">
                        <div className="text-[#F3F1EA]">{v.viewsCount.toLocaleString()} views</div>
                        <div className="text-[#9BA1A8]">{v.likes} likes</div>
                      </td>
                      <td className="py-4 px-4 text-[#9BA1A8] text-[13px]">{v.timestamp}</td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEditClick(v)}
                            className="p-2 rounded-[8px] text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#333A41] transition-colors"
                            title="Edit Video"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(v.id)}
                            disabled={isDeleting === v.id}
                            className="p-2 rounded-[8px] text-[#E14545] hover:bg-[#E14545]/10 transition-colors disabled:opacity-50"
                            title="Delete Video"
                          >
                            {isDeleting === v.id ? <div className="w-4 h-4 border-2 border-[#E14545] border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[#9BA1A8] text-[12px] uppercase tracking-wider border-b border-[#333A41]">
                    <th className="pb-3 px-4 font-semibold">Creator</th>
                    <th className="pb-3 px-4 font-semibold">Handle</th>
                    <th className="pb-3 px-4 font-semibold">Followers</th>
                    <th className="pb-3 px-4 font-semibold">Bio</th>
                    <th className="pb-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {creators.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#9BA1A8] text-[14px]">No creators found.</td>
                    </tr>
                  ) : (
                    creators.map(c => (
                      <tr key={c.id} className="border-b border-[#333A41]/50 hover:bg-[#333A41]/20 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1A1D21] border border-[#333A41] flex-shrink-0">
                              <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="text-[#F3F1EA] text-[14px] font-medium">{c.name}</p>
                              <p className="text-[#9BA1A8] text-[12px]">{c.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-[#F2B705] text-[14px]">{c.handle}</td>
                        <td className="py-4 px-4 text-[#F3F1EA] text-[14px] font-medium">
                          {c.subscribersCount.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-[#9BA1A8] text-[13px] max-w-xs truncate">
                          {c.bio || 'No bio'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleDeleteCreatorClick(c.id)}
                            disabled={isDeletingCreator === c.id}
                            className="p-2 rounded-[8px] text-[#E14545] hover:bg-[#E14545]/10 transition-colors disabled:opacity-50"
                            title="Delete Creator"
                          >
                            {isDeletingCreator === c.id ? (
                              <div className="w-4 h-4 border-2 border-[#E14545] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#F3F1EA] font-semibold">Fundraising Campaigns</h2>
                <button onClick={() => openCampaignModal()} className="flex items-center gap-2 bg-[#F2B705] text-[#14171A] px-4 py-2 rounded-full font-semibold hover:brightness-110 transition-all">
                  <Plus className="w-4 h-4" /> Add Campaign
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {campaigns.length === 0 ? (
                  <p className="text-[#9BA1A8] text-sm">No campaigns submitted yet.</p>
                ) : (
                  campaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-[#14171A] border border-[#333A41] rounded-[20px] p-6 flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-64 h-40 shrink-0 rounded-xl overflow-hidden relative">
                        <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 flex gap-2">
                          {campaign.status === 'approved' && (
                            <span className="bg-[#1DB954] text-white text-[11px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-md">
                              Approved
                            </span>
                          )}
                          {campaign.status === 'pending' && (
                            <span className="bg-[#F2B705] text-black text-[11px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-md">
                              Pending
                            </span>
                          )}
                          {campaign.isFeatured && (
                            <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[11px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-md flex items-center gap-1">
                              <Star className="w-3 h-3" /> Featured
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-xl font-bold text-[#F3F1EA] leading-tight mb-1">{campaign.title}</h3>
                            <p className="text-[#F2B705] text-[13px] font-semibold">Organized by {campaign.organizer}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {campaign.status === 'pending' ? (
                              <button 
                                onClick={() => handleCampaignAction(campaign.id, 'approve')}
                                className="w-9 h-9 rounded-full bg-[#1DB954]/10 text-[#1DB954] hover:bg-[#1DB954]/20 flex items-center justify-center transition-colors tooltip"
                                title="Approve Campaign"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleCampaignAction(campaign.id, 'reject')}
                                className="w-9 h-9 rounded-full bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 flex items-center justify-center transition-colors tooltip"
                                title="Revoke Approval"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                            {campaign.status === 'approved' && (
                              <button
                                onClick={() => handleCampaignAction(campaign.id, 'toggleFeature')}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors tooltip ${
                                  campaign.isFeatured 
                                    ? 'bg-[#F2B705] text-[#14171A]' 
                                    : 'bg-[#333A41] text-[#9BA1A8] hover:text-[#F3F1EA]'
                                }`}
                                title={campaign.isFeatured ? "Unfeature Campaign" : "Feature on Support Page"}
                              >
                                <Star className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => openCampaignModal(campaign)}
                              className="w-9 h-9 rounded-full bg-[#F2B705]/10 text-[#F2B705] hover:bg-[#F2B705]/20 flex items-center justify-center transition-colors tooltip"
                              title="Edit Campaign"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            
                            <button 
                              onClick={() => handleCampaignAction(campaign.id, 'delete')}
                              className="w-9 h-9 rounded-full bg-[#E14545]/10 text-[#E14545] hover:bg-[#E14545]/20 flex items-center justify-center transition-colors tooltip"
                              title="Delete Campaign"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-[#9BA1A8] text-sm mb-4 line-clamp-3">{campaign.description}</p>
                        
                        <div className="mt-auto flex items-center justify-between text-sm bg-[#1D2126] border border-[#333A41] p-3 rounded-xl">
                          <div>
                            <span className="text-[#9BA1A8]">Target: </span>
                            <span className="text-[#F3F1EA] font-semibold">UGX {campaign.target.toLocaleString()}</span>
                          </div>
                          <div className="w-px h-6 bg-[#333A41]" />
                          <div>
                            <span className="text-[#9BA1A8]">Raised: </span>
                            <span className="text-[#F2B705] font-semibold">UGX {campaign.raised.toLocaleString()}</span>
                          </div>
                          <div className="w-px h-6 bg-[#333A41]" />
                          <div>
                            <span className="text-[#9BA1A8]">Date: </span>
                            <span className="text-[#F3F1EA]">{campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-6">
              <h2 className="text-[#F3F1EA] font-semibold mb-4">Job Postings Moderation</h2>
              <div className="grid grid-cols-1 gap-6">
                {jobs.length === 0 ? (
                  <p className="text-[#9BA1A8] text-sm">No jobs submitted yet.</p>
                ) : (
                  jobs.map((job) => (
                    <div key={job.id} className="bg-[#14171A] border border-[#333A41] rounded-[20px] p-6 flex flex-col md:flex-row gap-6">
                      {job.posterUrl && (
                        <div className="w-full md:w-48 h-48 shrink-0 rounded-xl overflow-hidden relative bg-[#1A1D21]">
                          <img src={job.posterUrl} alt={job.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-bold text-[#F3F1EA] leading-tight">{job.title}</h3>
                              {job.status === 'approved' ? (
                                <span className="bg-[#1DB954] text-white text-[11px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Approved</span>
                              ) : (
                                <span className="bg-[#F2B705] text-black text-[11px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Pending</span>
                              )}
                            </div>
                            <p className="text-[#F2B705] text-[13px] font-semibold">{job.company} • {job.location}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {job.status === 'pending' ? (
                              <button onClick={() => handleJobAction(job.id, 'approve')} className="w-9 h-9 rounded-full bg-[#1DB954]/10 text-[#1DB954] hover:bg-[#1DB954]/20 flex items-center justify-center transition-colors tooltip" title="Approve Job">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button onClick={() => handleJobAction(job.id, 'reject')} className="w-9 h-9 rounded-full bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 flex items-center justify-center transition-colors tooltip" title="Revoke Approval">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleJobAction(job.id, 'delete')} className="w-9 h-9 rounded-full bg-[#E14545]/10 text-[#E14545] hover:bg-[#E14545]/20 flex items-center justify-center transition-colors tooltip" title="Delete Job">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[#9BA1A8] text-sm mb-4 line-clamp-3">{job.description}</p>
                        <div className="mt-auto flex flex-wrap gap-4 text-sm bg-[#1D2126] border border-[#333A41] p-3 rounded-xl">
                          {job.salary && <div><span className="text-[#9BA1A8]">Salary: </span><span className="text-[#1DB954] font-medium">{job.salary}</span></div>}
                          <div><span className="text-[#9BA1A8]">Contact: </span><span className="text-[#F3F1EA]">{job.contactEmail}</span></div>
                          {job.kycDocUrl && <div><span className="text-[#9BA1A8]">KYC: </span><a href={job.kycDocUrl} target="_blank" rel="noreferrer" className="text-[#F2B705] hover:underline flex items-center gap-1"><ImageIcon className="w-3 h-3"/> View Document</a></div>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'footer_terms' && (
            <AdminFooterTermsTab
              footerSettings={footerSettings}
              termsSettings={termsSettings}
              onUpdateFooterSettings={onUpdateFooterSettings}
              onUpdateTermsSettings={onUpdateTermsSettings}
              onNavigateToTerms={onNavigateToTerms}
            />
          )}
        </div>
      </div>
    </div>
  );
};
