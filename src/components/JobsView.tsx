import React, { useState } from 'react';
import { Job, Creator } from '../types';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Briefcase, MapPin, Building, Search, Plus, X, Upload, DollarSign, Mail, User } from 'lucide-react';

interface JobsViewProps {
  jobs: Job[];
  creators: Creator[];
  user: { uid: string; displayName: string | null; email: string | null } | null;
  onSelectJob: (job: Job) => void;
}

export const JobsView: React.FC<JobsViewProps> = ({ jobs, creators, user, onSelectJob }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPostJobOpen, setIsPostJobOpen] = useState(false);
  
  // Post Job Form State
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
    salary: '',
    contactEmail: ''
  });
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [posterProgress, setPosterProgress] = useState(0);
  const [kycProgress, setKycProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uploadFile = (file: File, path: string, setProgress: (p: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on('state_changed',
        (snapshot) => {
          setProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  const approvedJobs = jobs.filter(j => j.status === 'approved');
  const filteredJobs = approvedJobs.filter(j => 
    j.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    j.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to post a job.");
      return;
    }
    
    if (!newJob.title || !newJob.company || !newJob.location || !newJob.description || !newJob.contactEmail) {
      alert("Please fill in all required fields.");
      return;
    }

    if (!kycFile) {
      alert("Please upload your KYC details to verify your identity.");
      return;
    }

    setIsSubmitting(true);
    setPosterProgress(0);
    setKycProgress(0);
    try {
      let posterUrl = '';
      let kycDocUrl = '';

      if (posterFile) {
        const ext = posterFile.name.split('.').pop();
        posterUrl = await uploadFile(posterFile, `jobs/posters/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`, setPosterProgress);
      }

      if (kycFile) {
        const ext = kycFile.name.split('.').pop();
        kycDocUrl = await uploadFile(kycFile, `jobs/kyc/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`, setKycProgress);
      }

      await addDoc(collection(db, 'jobs'), {
        ...newJob,
        posterUrl,
        kycDocUrl,
        status: 'pending',
        creatorId: user.uid,
        createdAt: serverTimestamp()
      });

      alert("Job submitted successfully! It will be visible once approved by our community team.");
      setIsPostJobOpen(false);
      setNewJob({ title: '', company: '', location: '', description: '', salary: '', contactEmail: '' });
      setPosterFile(null);
      setKycFile(null);
      setPosterProgress(0);
      setKycProgress(0);
    } catch (err) {
      console.error("Error posting job:", err);
      alert("Failed to submit job. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 text-[#F2B705] mb-4">
            <Briefcase className="w-8 h-8" />
            <h1 className="text-4xl font-extrabold tracking-tight text-[#F3F1EA]">Job Board</h1>
          </div>
          <p className="text-lg text-[#9BA1A8] leading-relaxed">
            Discover opportunities from verified employers, or post an opening to find top talent in our community.
          </p>
        </div>
        
        <button 
          onClick={() => {
            if (!user) {
              alert("Please sign in to post a job.");
              return;
            }
            setIsPostJobOpen(true);
          }}
          className="bg-[#F2B705] hover:bg-[#F2B705]/90 text-black px-6 py-3.5 rounded-full font-bold shadow-lg shadow-[#F2B705]/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shrink-0 self-start md:self-auto"
        >
          <Plus className="w-5 h-5" /> Post a Job
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9BA1A8] w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search jobs by title, company, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#1A1D21] border-2 border-[#333A41] focus:border-[#F2B705] rounded-full pl-12 pr-6 py-4 text-[#F3F1EA] placeholder-[#9BA1A8] outline-none transition-colors shadow-inner"
        />
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-24 bg-[#14171A] border border-[#333A41] rounded-[24px]">
          <Briefcase className="w-16 h-16 text-[#9BA1A8]/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#F3F1EA] mb-2">No jobs found</h3>
          <p className="text-[#9BA1A8]">Try adjusting your search or be the first to post an opportunity!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map(job => {
            const creator = creators.find(c => c.id === job.creatorId);
            return (
              <div key={job.id} onClick={() => onSelectJob(job)} className="bg-[#14171A] border border-[#333A41] rounded-[24px] overflow-hidden hover:border-[#F2B705]/50 transition-colors group flex flex-col h-full shadow-lg hover:shadow-xl hover:shadow-[#F2B705]/10 cursor-pointer">
                {job.posterUrl && (
                  <div className="aspect-[16/9] w-full bg-[#1A1D21] relative overflow-hidden">
                    <img src={job.posterUrl} alt={job.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-grow">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-[#F3F1EA] mb-1 leading-tight group-hover:text-[#F2B705] transition-colors line-clamp-2">{job.title}</h3>
                    <div className="flex items-center gap-2 text-[#9BA1A8] text-[14px]">
                      <Building className="w-4 h-4" />
                      <span className="font-medium text-[#F3F1EA]">{job.company}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-[#9BA1A8] text-[13px]">
                      <MapPin className="w-4 h-4 text-[#F2B705]" />
                      <span>{job.location}</span>
                    </div>
                    {job.salary && (
                      <div className="flex items-center gap-2 text-[#9BA1A8] text-[13px]">
                        <DollarSign className="w-4 h-4 text-[#1DB954]" />
                        <span className="text-[#1DB954] font-medium">{job.salary}</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-[#9BA1A8] text-[14px] line-clamp-3 mb-6 flex-grow">{job.description}</p>
                  
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#333A41]">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-[12px] ${creator?.avatarGradient || 'bg-gradient-to-br from-gray-500 to-gray-700'}`}>
                        {creator?.initials ? creator.initials : <User className="w-4 h-4" />}
                      </div>
                      <span className="text-[13px] text-[#9BA1A8] truncate max-w-[120px]">{creator?.name || 'Community Member'}</span>
                    </div>
                    <button className="text-[#F2B705] font-semibold text-[13px] hover:underline">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Job Modal */}
      {isPostJobOpen && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 pt-16 sm:pt-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#1D2126] border border-[#333A41] rounded-[24px] shadow-2xl p-6 md:p-8 my-auto relative">
            <button 
              onClick={() => setIsPostJobOpen(false)}
              className="absolute top-6 right-6 text-[#9BA1A8] hover:text-[#F3F1EA] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="mb-8">
              <h2 className="text-[24px] font-bold text-[#F3F1EA] mb-2 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-[#F2B705]" /> Post a Job Opportunity
              </h2>
              <p className="text-[#9BA1A8]">Fill in the details below. For community safety, all jobs require a KYC document upload and will be reviewed before publishing.</p>
            </div>
            
            <form onSubmit={handleSubmitJob} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[#9BA1A8] text-[13px] font-medium mb-1.5">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-4 py-3 text-[#F3F1EA] outline-none focus:border-[#F2B705] transition-colors"
                    placeholder="e.g. Senior Content Manager"
                  />
                </div>
                <div>
                  <label className="block text-[#9BA1A8] text-[13px] font-medium mb-1.5">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={newJob.company}
                    onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                    className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-4 py-3 text-[#F3F1EA] outline-none focus:border-[#F2B705] transition-colors"
                    placeholder="e.g. Creator Studios"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[#9BA1A8] text-[13px] font-medium mb-1.5">Location *</label>
                  <input
                    type="text"
                    required
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-4 py-3 text-[#F3F1EA] outline-none focus:border-[#F2B705] transition-colors"
                    placeholder="e.g. Remote, Kampala, etc."
                  />
                </div>
                <div>
                  <label className="block text-[#9BA1A8] text-[13px] font-medium mb-1.5">Salary (Optional)</label>
                  <input
                    type="text"
                    value={newJob.salary}
                    onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                    className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-4 py-3 text-[#F3F1EA] outline-none focus:border-[#F2B705] transition-colors"
                    placeholder="e.g. UGX 2,000,000/mo"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[#9BA1A8] text-[13px] font-medium mb-1.5">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={newJob.contactEmail}
                  onChange={(e) => setNewJob({ ...newJob, contactEmail: e.target.value })}
                  className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-4 py-3 text-[#F3F1EA] outline-none focus:border-[#F2B705] transition-colors"
                  placeholder="Where should applicants send their CV?"
                />
              </div>

              <div>
                <label className="block text-[#9BA1A8] text-[13px] font-medium mb-1.5">Job Description *</label>
                <textarea
                  required
                  rows={4}
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-4 py-3 text-[#F3F1EA] outline-none focus:border-[#F2B705] transition-colors resize-none"
                  placeholder="Describe the role, responsibilities, and requirements..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 border border-[#333A41] bg-[#14171A] rounded-xl">
                <div>
                  <label className="block text-[#F3F1EA] font-semibold text-[14px] mb-1">Job Poster/Image</label>
                  <p className="text-[#9BA1A8] text-[12px] mb-3">Recommended aspect ratio: 16:9</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPosterFile(e.target.files[0]);
                      }
                    }}
                    className="block w-full text-xs text-[#9BA1A8] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#333A41] file:text-[#F3F1EA] hover:file:bg-[#434A51] file:transition-colors file:cursor-pointer"
                  />
                  {posterFile && (
                    <div className="mt-2">
                      <img src={URL.createObjectURL(posterFile)} alt="Poster preview" className="w-full h-24 object-cover rounded-lg" />
                      {posterProgress > 0 && posterProgress < 100 && (
                        <div className="h-1.5 bg-[#333A41] mt-1 rounded-full overflow-hidden"><div className="h-full bg-[#F2B705] transition-all duration-300" style={{width: `${posterProgress}%`}} /></div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[#F3F1EA] font-semibold text-[14px] mb-1 flex items-center gap-1">KYC Document <span className="text-[#E14545]">*</span></label>
                  <p className="text-[#9BA1A8] text-[12px] mb-3">ID/Company Registration (Kept private).</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setKycFile(e.target.files[0]);
                      }
                    }}
                    className="block w-full text-xs text-[#9BA1A8] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#F2B705]/20 file:text-[#F2B705] hover:file:bg-[#F2B705]/30 file:transition-colors file:cursor-pointer"
                  />
                  {kycFile && (
                    <div className="mt-2 text-xs text-[#9BA1A8]">
                      <p className="truncate">{kycFile.name}</p>
                      {kycProgress > 0 && kycProgress < 100 && (
                        <div className="h-1.5 bg-[#333A41] mt-1 rounded-full overflow-hidden"><div className="h-full bg-[#F2B705] transition-all duration-300" style={{width: `${kycProgress}%`}} /></div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPostJobOpen(false)}
                  className="px-6 py-3 text-[#F3F1EA] font-medium hover:bg-[#333A41] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-[#F2B705] text-[#14171A] font-bold rounded-xl hover:bg-[#F2B705]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Uploading...' : (
                    <>
                      <Upload className="w-4 h-4" /> Submit for Review
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
