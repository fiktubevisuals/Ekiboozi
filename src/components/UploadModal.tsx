import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import { CATEGORIES } from '../constants';
import { X, UploadCloud, Film, Image as ImageIcon } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

interface UploadModalProps {
  onClose: () => void;
  onUploadSuccess: (newVideo: Video) => void;
  user: FirebaseUser | null;
}

// Helper to extract a lightweight, web-optimized thumbnail (max 1280x720, ~40KB)
const extractOptimizedThumbnail = (file: File): Promise<Blob | null> => {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = url;

      let resolved = false;
      const finish = (blob: Blob | null) => {
        if (!resolved) {
          resolved = true;
          URL.revokeObjectURL(url);
          video.removeAttribute('src');
          video.load();
          resolve(blob);
        }
      };

      const timer = setTimeout(() => finish(null), 5000);

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1.5, Math.max(0.2, (video.duration || 2) / 2));
      };

      video.onseeked = () => {
        clearTimeout(timer);
        try {
          const maxW = 1280;
          const maxH = 720;
          let w = video.videoWidth || 640;
          let h = video.videoHeight || 360;

          if (w > maxW) {
            h = Math.round((h * maxW) / w);
            w = maxW;
          }
          if (h > maxH) {
            w = Math.round((w * maxH) / h);
            h = maxH;
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.75);
          } else {
            finish(null);
          }
        } catch {
          finish(null);
        }
      };

      video.onerror = () => {
        clearTimeout(timer);
        finish(null);
      };
    } catch {
      resolve(null);
    }
  });
};

export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUploadSuccess, user }) => {
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState(user?.displayName || 'Anonymous Creator');
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [description, setDescription] = useState('');
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState('0:00');
  const [autoThumbnailBlob, setAutoThumbnailBlob] = useState<Blob | null>(null);
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoPreviewUrl(url);
      
      const videoElement = document.createElement('video');
      videoElement.src = url;
      videoElement.crossOrigin = 'anonymous';

      videoElement.onloadedmetadata = () => {
        const mins = Math.floor(videoElement.duration / 60);
        const secs = Math.floor(videoElement.duration % 60);
        setVideoDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
      };

      // Extract optimized lightweight thumbnail
      extractOptimizedThumbnail(videoFile).then((blob) => {
        if (blob) {
          setAutoThumbnailBlob(blob);
        }
      });

      return () => URL.revokeObjectURL(url);
    } else {
      setVideoPreviewUrl(null);
      setVideoDuration('0:00');
      setAutoThumbnailBlob(null);
    }
  }, [videoFile]);

  useEffect(() => {
    if (thumbnailFile) {
      const url = URL.createObjectURL(thumbnailFile);
      setThumbnailPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setThumbnailPreviewUrl(null);
    }
  }, [thumbnailFile]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnailFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !channel.trim() || !videoFile) return;

    setIsUploading(true);
    setUploadError(null);

    const initials = channel
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'SN';

    try {
      // 1. Upload Video
      const videoRef = ref(storage, `videos/${Date.now()}_${videoFile.name}`);
      const videoUploadTask = uploadBytesResumable(videoRef, videoFile);

      const videoDownloadUrl = await new Promise<string>((resolve, reject) => {
        videoUploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 90; // Video is 90% of progress
            setUploadProgress(progress);
          },
          reject,
          async () => resolve(await getDownloadURL(videoUploadTask.snapshot.ref))
        );
      });

      // 2. Upload Thumbnail (Guaranteed lightweight thumbnail)
      let thumbDownloadUrl = undefined;
      let fileToUpload: Blob | File | null = thumbnailFile || autoThumbnailBlob;
      if (!fileToUpload && videoFile) {
        fileToUpload = await extractOptimizedThumbnail(videoFile);
      }
      
      if (fileToUpload) {
        const thumbName = thumbnailFile ? thumbnailFile.name : 'auto-thumbnail.jpg';
        const thumbRef = ref(storage, `thumbnails/${Date.now()}_${thumbName}`);
        const thumbUploadTask = uploadBytesResumable(thumbRef, fileToUpload);
        thumbDownloadUrl = await new Promise<string>((resolve, reject) => {
          thumbUploadTask.on('state_changed', () => {
             setUploadProgress(95); // Just a quick bump for thumbnail
          }, reject, async () => resolve(await getDownloadURL(thumbUploadTask.snapshot.ref)));
        });
      }

      setUploadProgress(100);

      // 3. Publish Object with real date and initial zero metrics
      const nowIso = new Date().toISOString();
      const newVideo: any = {
        id: `user-vid-${Date.now()}`,
        title: title.trim(),
        channel: channel.trim(),
        channelAvatar: user?.photoURL ? '' : 'from-[#21A8A3] to-[#157A76]',
        channelInitials: initials,
        creatorId: user?.uid || channel.toLowerCase().replace(/\s+/g, '-'),
        views: '0',
        viewsCount: 0,
        timestamp: 'Just now',
        createdAt: nowIso,
        publishedAt: nowIso,
        duration: videoDuration,
        durationSeconds: 150,
        thumbnailGradient: 'from-[#1D2126] to-[#14171A]',
        category: category,
        section: 'custom',
        description: description.trim() || 'Uploaded directly by creator.',
        likes: 0,
        likedBy: [],
        isLiked: false,
        commentsCount: 0,
        videoUrl: videoDownloadUrl,
      };

      if (user?.photoURL) newVideo.channelAvatarUrl = user.photoURL;
      if (thumbDownloadUrl) newVideo.thumbnailUrl = thumbDownloadUrl;

      onUploadSuccess(newVideo as Video);
      onClose();
    } catch (error: any) {
      console.error("Upload failed", error);
      setIsUploading(false);
      setUploadError(`Upload failed: ${error.message}. Please check your Firebase Storage rules.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-4xl bg-[#14171A] border border-[#333A41] rounded-[20px] sm:rounded-[24px] overflow-hidden shadow-2xl my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-5 border-b border-[#333A41] bg-[#1D2126] flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[12px] bg-[#F2B705]/15 flex items-center justify-center text-[#F2B705]">
              <Film className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="display-font text-[18px] sm:text-[20px] font-bold text-[#F3F1EA] leading-none mb-1">
                Upload Video
              </h2>
              <div className="text-[11px] sm:text-[12px] text-[#9BA1A8] font-medium flex items-center gap-1.5">
                Share your story with the world
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#333A41] transition-colors cursor-pointer touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              
              {/* Left Column: Media Uploads */}
              <div className="space-y-6">
                {/* Video Upload */}
                <div>
                  <label className="block text-[14px] font-semibold text-[#F3F1EA] mb-2 flex items-center gap-2">
                    <Film className="w-4 h-4 text-[#F2B705]" />
                    Video File *
                  </label>
                  {!videoPreviewUrl ? (
                    <div className="relative border-2 border-dashed border-[#333A41] rounded-[16px] p-8 text-center hover:border-[#F2B705] transition-colors cursor-pointer bg-[#1D2126] group">
                      <input
                        type="file"
                        accept="video/*"
                        required
                        onChange={handleVideoChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center justify-center pointer-events-none">
                        <UploadCloud className="w-10 h-10 text-[#9BA1A8] group-hover:text-[#F2B705] transition-colors mb-3" />
                        <span className="text-[15px] font-medium text-[#F3F1EA]">
                          Click or drag video to upload
                        </span>
                        <span className="text-[13px] text-[#656C73] mt-1">MP4, WebM, or OGG</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-[16px] overflow-hidden border border-[#333A41] bg-black aspect-video group">
                      <video 
                        src={videoPreviewUrl} 
                        controls 
                        className="w-full h-full object-contain"
                      />
                      <label className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-full text-[12px] font-medium backdrop-blur-md cursor-pointer transition-colors border border-white/10 opacity-0 group-hover:opacity-100 flex items-center gap-1.5">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoChange}
                          className="hidden"
                        />
                        Replace
                      </label>
                    </div>
                  )}
                </div>

                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-[14px] font-semibold text-[#F3F1EA] mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#21A8A3]" />
                    Custom Thumbnail
                  </label>
                  {!thumbnailPreviewUrl ? (
                    <div className="relative border-2 border-dashed border-[#333A41] rounded-[16px] p-6 text-center hover:border-[#21A8A3] transition-colors cursor-pointer bg-[#1D2126] group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center justify-center pointer-events-none">
                        <ImageIcon className="w-8 h-8 text-[#9BA1A8] group-hover:text-[#21A8A3] transition-colors mb-2" />
                        <span className="text-[14px] font-medium text-[#F3F1EA]">
                          Upload a thumbnail
                        </span>
                        <span className="text-[12px] text-[#656C73] mt-1">JPG, PNG, WebP (Optional)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-[16px] overflow-hidden border border-[#333A41] aspect-[16/10] group bg-[#1D2126]">
                      <img 
                        src={thumbnailPreviewUrl} 
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                      />
                      <label className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-full text-[12px] font-medium backdrop-blur-md cursor-pointer transition-colors border border-white/10 opacity-0 group-hover:opacity-100 flex items-center gap-1.5">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                          className="hidden"
                        />
                        Replace
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Details */}
              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a catchy title"
                    className="w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-3 text-[14px] text-[#F3F1EA] placeholder:text-[#656C73] focus:border-[#F2B705] outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">
                    Story Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell viewers about your video..."
                    className="w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-3 text-[14px] text-[#F3F1EA] placeholder:text-[#656C73] focus:border-[#F2B705] outline-none resize-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">
                      Channel Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      readOnly={!!user}
                      placeholder="Your Channel Name"
                      className={`w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-3 text-[14px] text-[#F3F1EA] placeholder:text-[#656C73] focus:border-[#F2B705] outline-none transition-colors ${user ? 'opacity-70 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#9BA1A8] mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#1D2126] border border-[#333A41] rounded-[12px] px-4 py-3 text-[14px] text-[#F3F1EA] focus:border-[#F2B705] outline-none cursor-pointer transition-colors"
                    >
                      {CATEGORIES.filter((c) => c !== 'For you').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {uploadError && (
                  <div className="mt-4 p-4 rounded-[12px] bg-[#E14545]/10 border border-[#E14545]/20 text-[#E14545] text-[13px] font-medium leading-relaxed">
                    {uploadError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-[#333A41] bg-[#1D2126] flex-shrink-0 rounded-b-[20px] sm:rounded-b-[24px]">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-5 py-2.5 text-[14px] text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#333A41] rounded-full font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title || !channel || !videoFile || isUploading}
              className="flex items-center gap-2 bg-[#F2B705] hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-[#14171A] px-7 py-2.5 rounded-full text-[14px] font-bold transition-all cursor-pointer shadow-md relative overflow-hidden"
            >
              {isUploading && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-black/10 transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }} 
                />
              )}
              {isUploading ? (
                <span className="relative z-10 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#14171A] border-t-transparent rounded-full animate-spin" />
                  Uploading... {Math.round(uploadProgress)}%
                </span>
              ) : (
                <span className="relative z-10 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" />
                  <span>Publish Video</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


