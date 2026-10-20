import React, { useState } from 'react';
import { Video, Job, Campaign } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import {
  X,
  Edit3,
  Trash2,
  Eye,
  Heart,
  MessageCircle,
  Play,
  Film,
  Plus,
  Save,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  HeartHandshake,
  Sparkles,
  Globe,
  Clock,
  Tag
} from 'lucide-react';
import { doc, updateDoc, deleteDoc as deleteFirestoreDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES } from '../constants';
import { formatRelativeTime, formatViewCount } from '../utils/dateUtils';

interface MyUploadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  videos: Video[];
  jobs?: Job[];
  campaigns?: Campaign[];
  onSelectVideo: (video: Video) => void;
  onVideoUpdated: (updatedVideo: Video) => void;
  onVideoDeleted: (videoId: string) => void;
  onOpenUpload: () => void;
}

export const MyUploadsModal: React.FC<MyUploadsModalProps> = ({
  isOpen,
  onClose,
  user,
  videos,
  jobs = [],
  campaigns = [],
  onSelectVideo,
  onVideoUpdated,
  onVideoDeleted,
  onOpenUpload
}) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'jobs' | 'campaigns'>('videos');
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Filter user's uploaded videos strictly by creatorId or user email (never loosely by channel name)
  const userVideos = videos.filter((v) => {
    if (!user) return false;
    return (
      v.creatorId === user.uid ||
      v.uploadedByUid === user.uid ||
      (Boolean(v.userEmail) && Boolean(user.email) && v.userEmail!.toLowerCase() === user.email!.toLowerCase())
    );
  });

  const userJobs = jobs.filter((j) => user && j.creatorId === user.uid);
  const userCampaigns = campaigns.filter(
    (c) => user && (c.creatorId === user.uid || (user.displayName && c.organizer === user.displayName))
  );

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
        updatedAt: new Date().toISOString()
      };

      // 1. Update in Firestore
      const videoRef = doc(db, 'videos', editingVideo.id);
      await updateDoc(videoRef, updatedFields);

      // 2. Local state update
      const updatedVideo: Video = {
        ...editingVideo,
        ...updatedFields
      };

      onVideoUpdated(updatedVideo);
      setEditingVideo(null);
      setToastMessage({ type: 'success', text: 'Story updated successfully!' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating video:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to update story in database.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const ConfirmDeleteDialog = () => {
    if (!deletingVideoId) return null;
    const targetVideo = userVideos.find((v) => v.id === deletingVideoId);

    const handleConfirmDelete = async () => {
      try {
        await onVideoDeleted(deletingVideoId);
        setDeletingVideoId(null);
        setToastMessage({ type: 'success', text: 'Story permanently deleted.' });
        setTimeout(() => setToastMessage(null), 3000);
      } catch (err: any) {
        console.error('Error deleting video:', err);
        setToastMessage({ type: 'error', text: 'Failed to delete story.' });
      }
    };

    return (
      <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div className="w-full max-w-sm bg-[#1D2126] border border-[#333A41] rounded-[24px] p-6 shadow-2xl text-center animate-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-full bg-[#E14545]/15 text-[#E14545] flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-[17px] font-bold text-[#F3F1EA] mb-1.5">Delete Story?</h3>
          <p className="text-[13px] text-[#9BA1A8] mb-5 leading-relaxed">
            Are you sure you want to delete <span className="text-[#F3F1EA] font-semibold">&quot;{targetVideo?.title || 'this video'}&quot;</span>? This action is permanent and cannot be undone.
          </p>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDeletingVideoId(null)}
              className="flex-1 py-2.5 rounded-full bg-[#333A41] hover:bg-[#333A41]/80 text-[#F3F1EA] text-[13px] font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="flex-1 py-2.5 rounded-full bg-[#E14545] hover:bg-[#E14545]/90 text-white text-[13px] font-bold shadow transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <ConfirmDeleteDialog />

      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[#14171A] border border-[#333A41] rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262B31] bg-[#181B1F]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#F2B705] to-[#E8890C] flex items-center justify-center text-[#14171A] font-bold shadow">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#F3F1EA] display-font">
                My Content Studio
              </h2>
              <p className="text-[12px] text-[#9BA1A8]">
                View, edit, update, or delete your uploaded stories and content
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1D2126] hover:bg-[#262B31] text-[#9BA1A8] hover:text-[#F3F1EA] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#181B1F]/60 border-b border-[#262B31]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'videos'
                  ? 'bg-[#F2B705] text-[#14171A] shadow-sm'
                  : 'text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262B31]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Stories ({userVideos.length})</span>
            </button>

            {userJobs.length > 0 && (
              <button
                onClick={() => setActiveTab('jobs')}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'jobs'
                    ? 'bg-[#F2B705] text-[#14171A] shadow-sm'
                    : 'text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262B31]'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Jobs ({userJobs.length})</span>
              </button>
            )}

            {userCampaigns.length > 0 && (
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'campaigns'
                    ? 'bg-[#F2B705] text-[#14171A] shadow-sm'
                    : 'text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262B31]'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Campaigns ({userCampaigns.length})</span>
              </button>
            )}
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenUpload();
            }}
            className="px-3.5 py-1.5 rounded-full bg-[#F2B705]/15 hover:bg-[#F2B705]/25 border border-[#F2B705]/40 text-[#F2B705] text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload New</span>
          </button>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`px-6 py-2.5 text-[13px] font-medium flex items-center justify-between animate-in slide-in-from-top-2 ${
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
            <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 no-scrollbar space-y-4">
          {activeTab === 'videos' && (
            <>
              {/* Inline Edit Form Modal / Card */}
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
                    <span className="text-[11px] text-[#9BA1A8]">Modifying document in Firestore</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Title */}
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

                    {/* Category */}
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

                    {/* Custom Thumbnail URL */}
                    <div>
                      <label className="block text-[12px] font-semibold text-[#9BA1A8] mb-1">
                        Thumbnail Image URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={editThumbnailUrl}
                        onChange={(e) => setEditThumbnailUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-3.5 py-2 text-[13px] text-[#F3F1EA] outline-none focus:border-[#F2B705]"
                      />
                    </div>

                    {/* Description */}
                    <div className="sm:col-span-2">
                      <label className="block text-[12px] font-semibold text-[#9BA1A8] mb-1">
                        Description
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Describe your story or story details..."
                        rows={3}
                        className="w-full bg-[#14171A] border border-[#333A41] rounded-xl px-3.5 py-2 text-[13px] text-[#F3F1EA] outline-none focus:border-[#F2B705] resize-none"
                      />
                    </div>
                  </div>

                  {/* Actions */}
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
                      <span>{isSaving ? 'Saving Changes...' : 'Save Updates'}</span>
                    </button>
                  </div>
                </form>
              )}

              {userVideos.length === 0 ? (
                <div className="py-16 text-center bg-[#1D2126]/60 border border-[#333A41] rounded-[24px] p-8 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F2B705]/15 text-[#F2B705] flex items-center justify-center mb-3">
                    <Film className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-[#F3F1EA] mb-1">No uploaded stories yet</h3>
                  <p className="text-xs text-[#9BA1A8] max-w-sm mb-5 leading-relaxed">
                    You haven&apos;t posted any video stories yet. Click below to share your first story with Ekiboozi viewers across Uganda!
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenUpload();
                    }}
                    className="px-5 py-2.5 rounded-full bg-[#F2B705] text-[#14171A] text-xs font-bold shadow hover:bg-[#F2B705]/90 cursor-pointer transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload Story</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {userVideos.map((vid) => (
                    <div
                      key={vid.id}
                      className="group bg-[#1D2126] border border-[#333A41] hover:border-[#F2B705]/50 rounded-[20px] p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200"
                    >
                      {/* Left thumbnail & detail info */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        {/* Thumbnail */}
                        <div
                          onClick={() => {
                            onClose();
                            onSelectVideo(vid);
                          }}
                          className={`relative w-24 h-16 sm:w-28 sm:h-18 rounded-[12px] overflow-hidden bg-gradient-to-br ${vid.thumbnailGradient} flex-shrink-0 cursor-pointer border border-[#333A41] group-hover:border-[#F2B705]/60 group-hover:scale-105 transition-all`}
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

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-[#333A41] text-[#F2B705] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />
                              {vid.category || 'For you'}
                            </span>
                            <span className="text-[11px] text-[#656C73] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(vid.createdAt || vid.publishedAt || vid.timestamp)}
                            </span>
                          </div>

                          <h4
                            onClick={() => {
                              onClose();
                              onSelectVideo(vid);
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

                          <div className="flex items-center gap-3.5 mt-2 text-[12px] text-[#9BA1A8]">
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

                      {/* Right Control Buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#333A41]/60">
                        {/* Play */}
                        <button
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

                        {/* Edit */}
                        <button
                          onClick={() => handleStartEdit(vid)}
                          className="px-3.5 py-1.5 rounded-full bg-[#F2B705]/15 hover:bg-[#F2B705]/25 border border-[#F2B705]/40 text-[#F2B705] text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Edit title, description or category"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeletingVideoId(vid.id)}
                          className="px-3 py-1.5 rounded-full bg-[#E14545]/15 hover:bg-[#E14545]/25 border border-[#E14545]/30 text-[#E14545] text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Permanently delete video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-3">
              {userJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-[#1D2126] border border-[#333A41] rounded-[20px] p-4 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-[#F3F1EA] text-[15px]">{job.title}</h4>
                    <p className="text-[12px] text-[#9BA1A8]">{job.company} · {job.location} · {job.salary}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#F2B705]/15 text-[#F2B705] text-[11px] font-bold uppercase">
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="space-y-3">
              {userCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-[#1D2126] border border-[#333A41] rounded-[20px] p-4 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-[#F3F1EA] text-[15px]">{camp.title}</h4>
                    <p className="text-[12px] text-[#9BA1A8]">Raised: {camp.raised} UGX of {camp.target} UGX</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#21A8A3]/15 text-[#21A8A3] text-[11px] font-bold uppercase">
                    {camp.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
