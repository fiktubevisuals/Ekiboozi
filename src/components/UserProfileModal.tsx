import React, { useState } from 'react';
import { JobApplication, Creator, Video } from '../types';
import {
  X,
  ShieldCheck,
  LogOut,
  Briefcase,
  Film,
  Play,
  Edit3,
  Trash2,
  Plus,
  Save,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  User as UserIcon,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES } from '../constants';
import { formatRelativeTime, formatViewCount } from '../utils/dateUtils';

interface UserProfileModalProps {
  onClose: () => void;
  followedCreators: Creator[];
  userUploadedVideos: Video[];
  likedVideosCount: number;
  user: FirebaseUser | null;
  onSignOut: () => void;
  jobApplications: JobApplication[];
  onOpenMyUploads?: () => void;
  onSelectVideo?: (video: Video) => void;
  onVideoUpdated?: (updatedVideo: Video) => void;
  onVideoDeleted?: (videoId: string) => Promise<void> | void;
  onOpenUpload?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  onClose,
  followedCreators,
  userUploadedVideos,
  likedVideosCount,
  user,
  onSignOut,
  jobApplications,
  onOpenMyUploads,
  onSelectVideo,
  onVideoUpdated,
  onVideoDeleted,
  onOpenUpload,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'uploads'>('overview');
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleStartEdit = (video: Video) => {
    setEditingVideo(video);
    setEditTitle(video.title || '');
    setEditDescription(video.description || '');
    setEditCategory(video.category || 'For you');
    setEditThumbnailUrl(video.thumbnailUrl || '');
  };

  const handleCancelEdit = () => {
    setEditingVideo(null);
  };

  const handleSaveVideoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;

    if (!editTitle.trim()) {
      setToastMessage({ type: 'error', text: 'Story title cannot be empty.' });
      return;
    }

    setIsSaving(true);
    try {
      const updatedFields = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        thumbnailUrl: editThumbnailUrl.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };

      // 1. Update in Firestore
      const videoRef = doc(db, 'videos', editingVideo.id);
      await updateDoc(videoRef, updatedFields);

      // 2. Propagate local update
      const updatedVideo: Video = {
        ...editingVideo,
        ...updatedFields,
      };

      if (onVideoUpdated) {
        onVideoUpdated(updatedVideo);
      }
      setEditingVideo(null);
      setToastMessage({ type: 'success', text: 'Story updated successfully!' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating video:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to update story in database.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingVideoId) return;
    setIsDeleting(true);
    try {
      if (onVideoDeleted) {
        await onVideoDeleted(deletingVideoId);
      }
      setDeletingVideoId(null);
      setToastMessage({ type: 'success', text: 'Story permanently deleted.' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting video:', err);
      setToastMessage({ type: 'error', text: 'Failed to delete story.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const targetDeleteVideo = userUploadedVideos.find((v) => v.id === deletingVideoId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      {/* Delete Confirmation Modal */}
      {deletingVideoId && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#1D2126] border border-[#333A41] rounded-[24px] p-6 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-[#E14545]/15 text-[#E14545] flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-[17px] font-bold text-[#F3F1EA] mb-1.5">Delete Story?</h3>
            <p className="text-[13px] text-[#9BA1A8] mb-5 leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="text-[#F3F1EA] font-semibold">
                &quot;{targetDeleteVideo?.title || 'this video'}&quot;
              </span>
              ? This action permanently removes it from the database once and for all.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingVideoId(null)}
                className="flex-1 py-2.5 rounded-full bg-[#333A41] hover:bg-[#333A41]/80 text-[#F3F1EA] text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-full bg-[#E14545] hover:bg-[#E14545]/90 text-white text-[13px] font-bold shadow transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Profile Modal Card */}
      <div
        className={`relative w-full ${
          activeTab === 'uploads' ? 'max-w-3xl' : 'max-w-lg'
        } bg-[#14171A] border border-[#333A41] rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-all duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#333A41] bg-[#181B1F]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#333A41] flex items-center justify-center overflow-hidden border border-[#F2B705]/40 text-[#F3F1EA] font-bold text-[14px]">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                (user?.displayName || user?.email || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="display-font text-[17px] font-bold text-[#F3F1EA] leading-tight">
                {user?.displayName || 'Your Profile'}
              </h2>
              <p className="text-[12px] text-[#9BA1A8]">{user?.email || 'Authenticated User'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1D2126] hover:bg-[#262B31] text-[#9BA1A8] hover:text-[#F3F1EA] flex items-center justify-center transition-colors cursor-pointer"
            title="Close profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#181B1F]/60 border-b border-[#262B31]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-[#F2B705] text-[#14171A] shadow-sm'
                  : 'text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262B31]'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('uploads')}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'uploads'
                  ? 'bg-[#F2B705] text-[#14171A] shadow-sm'
                  : 'text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262B31]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>My Uploads ({userUploadedVideos.length})</span>
            </button>
          </div>

          {onOpenUpload && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUpload();
              }}
              className="px-3 py-1.5 rounded-full bg-[#F2B705]/15 hover:bg-[#F2B705]/25 border border-[#F2B705]/40 text-[#F2B705] text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Video</span>
            </button>
          )}
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`px-5 py-2.5 text-[13px] font-medium flex items-center justify-between animate-in slide-in-from-top-2 ${
              toastMessage.type === 'success'
                ? 'bg-[#1DB954]/15 text-[#1DB954] border-b border-[#1DB954]/30'
                : 'bg-[#E14545]/15 text-[#E14545] border-b border-[#E14545]/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 no-scrollbar space-y-4">
          {activeTab === 'overview' && (
            <>
              {/* Profile Card */}
              <div className="flex flex-col items-center text-center py-4 bg-[#181B1F]/40 border border-[#333A41] rounded-[20px] p-5">
                <div className="w-18 h-18 rounded-full bg-[#333A41] flex items-center justify-center text-2xl font-bold text-[#F3F1EA] shadow-lg mb-3 overflow-hidden border-2 border-[#F2B705]/50">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>
                      {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="display-font text-[19px] font-bold text-[#F3F1EA]">
                  {user?.displayName || 'Anonymous'}
                </h3>
                <p className="text-[13px] text-[#9BA1A8] mt-0.5">{user?.email || 'Guest user'}</p>
                <div className="flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-[#F2B705]/15 text-[#F2B705] text-[12px] font-semibold border border-[#F2B705]/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Creator & Viewer</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#1D2126] p-3 rounded-[16px] border border-[#333A41]/60">
                  <div className="text-[20px] font-bold text-[#F3F1EA]">
                    {followedCreators.length}
                  </div>
                  <div className="text-[11px] text-[#9BA1A8] mt-0.5 font-medium">Following</div>
                </div>
                <div className="bg-[#1D2126] p-3 rounded-[16px] border border-[#333A41]/60">
                  <div className="text-[20px] font-bold text-[#F3F1EA]">{likedVideosCount}</div>
                  <div className="text-[11px] text-[#9BA1A8] mt-0.5 font-medium">Liked</div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('uploads')}
                  className="bg-[#1D2126] hover:bg-[#262B31] p-3 rounded-[16px] border border-[#F2B705]/40 hover:border-[#F2B705] transition-all cursor-pointer group text-center"
                  title="Click to view your uploads"
                >
                  <div className="text-[20px] font-bold text-[#F2B705] group-hover:scale-105 transition-transform">
                    {userUploadedVideos.length}
                  </div>
                  <div className="text-[11px] text-[#F2B705] mt-0.5 font-semibold flex items-center justify-center gap-1">
                    <span>My Stories</span>
                    <Film className="w-3 h-3" />
                  </div>
                </button>
              </div>

              {/* Manage My Content Button */}
              <button
                type="button"
                onClick={() => setActiveTab('uploads')}
                className="w-full bg-[#F2B705]/15 hover:bg-[#F2B705]/25 text-[#F2B705] border border-[#F2B705]/40 flex items-center justify-between px-4 py-3 rounded-[16px] font-semibold text-[13px] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Film className="w-4 h-4 text-[#F2B705]" />
                  <span>View & Manage My Uploaded Stories</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#14171A] text-[12px] font-mono font-bold text-white">
                  {userUploadedVideos.length}
                </span>
              </button>

              {/* Job Applications */}
              {jobApplications.length > 0 && (
                <div className="py-3 border-t border-[#333A41]">
                  <h4 className="text-[14px] font-semibold text-[#F3F1EA] mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#F2B705]" /> Job Applications
                  </h4>
                  <div className="flex flex-col gap-2">
                    {jobApplications.map((app) => (
                      <div
                        key={app.id}
                        className="flex justify-between items-center text-[12px] bg-[#1D2126] p-2.5 rounded-[12px] border border-[#333A41]/60"
                      >
                        <span className="text-[#9BA1A8]">Job ID: {app.jobId.substring(0, 8)}...</span>
                        <span className="text-[#F2B705] font-semibold px-2 py-0.5 rounded-full bg-[#F2B705]/10">
                          {app.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full bg-[#E14545]/15 text-[#E14545] flex items-center justify-center gap-2 hover:bg-[#E14545]/25 font-semibold text-[14px] py-2.5 rounded-full border border-transparent transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-[#1D2126] hover:bg-[#262B31] text-[#F3F1EA] font-medium text-[14px] py-2.5 rounded-full border border-[#333A41] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </>
          )}

          {activeTab === 'uploads' && (
            <div className="space-y-4">
              {/* Inline Edit Form */}
              {editingVideo && (
                <form
                  onSubmit={handleSaveVideoUpdate}
                  className="bg-[#1D2126] border-2 border-[#F2B705]/60 rounded-[20px] p-5 shadow-xl space-y-4 animate-in fade-in duration-200"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#333A41]">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-[#F2B705]" />
                      <h3 className="text-[15px] font-bold text-[#F3F1EA]">
                        Edit Story: &quot;{editingVideo.title}&quot;
                      </h3>
                    </div>
                    <span className="text-[11px] text-[#9BA1A8]">Saving to Firestore</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[12px] font-semibold text-[#9BA1A8] mb-1">
                        Story Title <span className="text-[#E14545]">*</span>
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Enter story title"
                        className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-3.5 py-2 text-[14px] text-[#F3F1EA] outline-none focus:border-[#F2B705]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-[#9BA1A8] mb-1">
                        Category
                      </label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-3.5 py-2 text-[13px] text-[#F3F1EA] outline-none focus:border-[#F2B705]"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-[#9BA1A8] mb-1">
                        Thumbnail Image URL
                      </label>
                      <input
                        type="url"
                        value={editThumbnailUrl}
                        onChange={(e) => setEditThumbnailUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-3.5 py-2 text-[13px] text-[#F3F1EA] outline-none focus:border-[#F2B705]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[12px] font-semibold text-[#9BA1A8] mb-1">
                        Description
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Describe your story..."
                        rows={3}
                        className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-3.5 py-2 text-[13px] text-[#F3F1EA] outline-none focus:border-[#F2B705] resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#333A41]">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 rounded-full bg-[#333A41] hover:bg-[#333A41]/80 text-[#F3F1EA] text-[13px] font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 rounded-full bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] text-[13px] font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save Updates'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Uploads List */}
              {userUploadedVideos.length === 0 ? (
                <div className="py-14 text-center bg-[#1D2126]/60 border border-[#333A41] rounded-[24px] p-8 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F2B705]/15 text-[#F2B705] flex items-center justify-center mb-3">
                    <Film className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-[#F3F1EA] mb-1">
                    No uploaded stories yet
                  </h3>
                  <p className="text-xs text-[#9BA1A8] max-w-sm mb-5 leading-relaxed">
                    You haven&apos;t published any video stories yet. Each user can only view and manage their own uploads right here.
                  </p>
                  {onOpenUpload && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenUpload();
                      }}
                      className="px-5 py-2.5 rounded-full bg-[#F2B705] text-[#14171A] text-xs font-bold shadow hover:bg-[#F2B705]/90 cursor-pointer transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload Your First Story</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {userUploadedVideos.map((vid) => (
                    <div
                      key={vid.id}
                      className="group bg-[#1D2126] border border-[#333A41] hover:border-[#F2B705]/50 rounded-[20px] p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200"
                    >
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div
                          onClick={() => {
                            if (onSelectVideo) {
                              onClose();
                              onSelectVideo(vid);
                            }
                          }}
                          className={`relative w-24 h-16 sm:w-28 sm:h-18 rounded-[12px] overflow-hidden bg-gradient-to-br ${
                            vid.thumbnailGradient || 'from-[#1D2126] to-[#14171A]'
                          } flex-shrink-0 cursor-pointer border border-[#333A41] group-hover:border-[#F2B705]/60 group-hover:scale-105 transition-all`}
                        >
                          {vid.thumbnailUrl && (
                            <img
                              src={vid.thumbnailUrl}
                              alt={vid.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Play className="w-5 h-5 text-white fill-white opacity-80 group-hover:scale-110 transition-transform" />
                          </div>
                          <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] font-mono px-1 py-0.2 rounded text-[#F3F1EA]">
                            {vid.duration}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-[#333A41] text-[#F2B705] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />
                              {vid.category || 'For you'}
                            </span>
                            <span className="text-[11px] text-[#656C73] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(
                                vid.createdAt || vid.publishedAt || vid.timestamp
                              )}
                            </span>
                          </div>

                          <h4
                            onClick={() => {
                              if (onSelectVideo) {
                                onClose();
                                onSelectVideo(vid);
                              }
                            }}
                            className="text-[15px] font-semibold text-[#F3F1EA] hover:text-[#F2B705] cursor-pointer truncate transition-colors"
                            title={vid.title}
                          >
                            {vid.title}
                          </h4>

                          {vid.description && (
                            <p className="text-[12px] text-[#9BA1A8] line-clamp-1 mt-0.5 leading-relaxed">
                              {vid.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3.5 mt-1.5 text-[12px] text-[#9BA1A8]">
                            <span className="flex items-center gap-1" title="Views">
                              <Eye className="w-3.5 h-3.5 text-[#21A8A3]" />
                              {formatViewCount(vid.viewsCount, vid.views)}
                            </span>
                            <span className="flex items-center gap-1" title="Likes">
                              <Heart className="w-3.5 h-3.5 text-[#E14545]" />
                              {vid.likes || 0}
                            </span>
                            <span className="flex items-center gap-1" title="Comments">
                              <MessageCircle className="w-3.5 h-3.5 text-[#F2B705]" />
                              {vid.commentsCount || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#333A41]/60">
                        {onSelectVideo && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectVideo(vid);
                            }}
                            className="px-3 py-1.5 rounded-full bg-[#14171A] hover:bg-[#262B31] border border-[#333A41] text-[#F3F1EA] text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Watch video"
                          >
                            <Play className="w-3.5 h-3.5 text-[#F2B705] fill-[#F2B705]" />
                            <span>Watch</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEdit(vid)}
                          className="px-3 py-1.5 rounded-full bg-[#F2B705]/15 hover:bg-[#F2B705]/25 border border-[#F2B705]/40 text-[#F2B705] text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Edit story"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingVideoId(vid.id)}
                          className="px-3 py-1.5 rounded-full bg-[#E14545]/15 hover:bg-[#E14545]/25 border border-[#E14545]/30 text-[#E14545] text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
