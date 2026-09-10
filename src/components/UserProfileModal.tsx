import React from 'react';
import { JobApplication, Creator, Video } from '../types';
import { X, User, Heart, Film, Users, ShieldCheck, LogOut, Briefcase } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface UserProfileModalProps {
  onClose: () => void;
  followedCreators: Creator[];
  userUploadedVideos: Video[];
  likedVideosCount: number;
  user: FirebaseUser | null;
  onSignOut: () => void;
  jobApplications: JobApplication[];
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  onClose,
  followedCreators,
  userUploadedVideos,
  likedVideosCount,
  user,
  onSignOut,
  jobApplications,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md bg-[#14171A] border border-[#333A41] rounded-[20px] overflow-hidden shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#333A41]">
          <h2 className="display-font text-[18px] font-bold text-[#F3F1EA]">
            Your Profile
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#333A41] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center my-6">
          <div className="w-16 h-16 rounded-full bg-[#333A41] flex items-center justify-center text-xl font-bold text-[#0C1516] shadow-lg mb-3 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-[#F3F1EA]">
                {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h3 className="display-font text-[18px] font-semibold text-[#F3F1EA]">
            {user?.displayName || 'Anonymous'}
          </h3>
          <p className="text-[13px] text-[#9BA1A8]">{user?.email || 'Guest user'}</p>
          <div className="flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-[#F2B705]/15 text-[#F2B705] text-[12px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Viewer</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 py-4 border-y border-[#333A41] text-center">
          <div className="bg-[#1D2126] p-3 rounded-[12px] border border-[#333A41]/50">
            <div className="text-[18px] font-bold text-[#F3F1EA]">{followedCreators.length}</div>
            <div className="text-[11px] text-[#9BA1A8] mt-0.5">Following</div>
          </div>
          <div className="bg-[#1D2126] p-3 rounded-[12px] border border-[#333A41]/50">
            <div className="text-[18px] font-bold text-[#F3F1EA]">{likedVideosCount}</div>
            <div className="text-[11px] text-[#9BA1A8] mt-0.5">Liked</div>
          </div>
          <div className="bg-[#1D2126] p-3 rounded-[12px] border border-[#333A41]/50">
            <div className="text-[18px] font-bold text-[#F3F1EA]">{userUploadedVideos.length}</div>
            <div className="text-[11px] text-[#9BA1A8] mt-0.5">Stories</div>
          </div>
        </div>
        
        {jobApplications.length > 0 && (
          <div className="py-4 border-b border-[#333A41]">
            <h4 className="text-[14px] font-semibold text-[#F3F1EA] mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#F2B705]" /> Job Applications
            </h4>
            <div className="flex flex-col gap-2">
              {jobApplications.map(app => (
                <div key={app.id} className="flex justify-between items-center text-[12px] bg-[#1D2126] p-2 rounded-[8px]">
                  <span className="text-[#9BA1A8]">Job ID: {app.jobId.substring(0, 8)}...</span>
                  <span className="text-[#F2B705] font-medium">{app.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={onSignOut}
            className="w-full bg-[#E14545]/15 text-[#E14545] flex items-center justify-center gap-2 hover:bg-[#E14545]/25 font-medium text-[14px] py-2.5 rounded-full border border-transparent transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <button
            onClick={onClose}
            className="w-full bg-[#1D2126] hover:bg-[#262B31] text-[#F3F1EA] font-medium text-[14px] py-2.5 rounded-full border border-[#333A41] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
