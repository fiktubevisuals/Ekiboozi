import React from 'react';
import { X, UploadCloud, Sparkles, Camera } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface CreateActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUpload: () => void;
  onSelectRecordCamera: () => void;
  user: FirebaseUser | null;
  onSignIn: () => void;
}

export const CreateActionModal: React.FC<CreateActionModalProps> = ({
  isOpen,
  onClose,
  onSelectUpload,
  onSelectRecordCamera,
  user,
  onSignIn,
}) => {
  if (!isOpen) return null;

  const handleUploadClick = () => {
    if (!user) {
      onClose();
      onSignIn();
      return;
    }
    onClose();
    onSelectUpload();
  };

  const handleRecordCameraClick = () => {
    if (!user) {
      onClose();
      onSignIn();
      return;
    }
    onClose();
    onSelectRecordCamera();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[105] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#14171A] border-t sm:border border-[#333A41] rounded-t-[32px] sm:rounded-[28px] overflow-hidden shadow-2xl p-6 flex flex-col animate-in slide-in-from-bottom-8 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#262B31]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F2B705] to-[#FF2D55] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#F3F1EA] display-font">Create & Connect</h3>
              <p className="text-[12px] text-[#9BA1A8]">Record camera or upload video files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1D2126] hover:bg-[#262B31] text-[#9BA1A8] hover:text-[#F3F1EA] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2 Creation Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 pb-3">
          {/* 1. Record with Device Camera */}
          <button
            onClick={handleRecordCameraClick}
            className="relative flex flex-col items-center justify-center p-5 rounded-[20px] bg-gradient-to-b from-[#21A8A3]/15 to-[#1D2126] border-2 border-[#21A8A3]/60 hover:border-[#21A8A3] hover:shadow-[0_0_24px_rgba(33,168,163,0.35)] active:scale-95 transition-all duration-200 text-center group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-gradient-to-br from-[#21A8A3] to-[#146b68] flex items-center justify-center text-white mb-2.5 shadow-lg group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>

            <span className="text-[15px] font-bold text-[#F3F1EA] group-hover:text-white mb-1">
              Record Camera
            </span>
            <span className="text-[11px] text-[#9BA1A8] line-clamp-2 leading-tight">
              Capture video directly with your device camera
            </span>
          </button>

          {/* 2. Upload Video Option */}
          <button
            onClick={handleUploadClick}
            className="flex flex-col items-center justify-center p-5 rounded-[20px] bg-[#1D2126] hover:bg-[#262B31] border border-[#333A41] hover:border-[#F2B705]/60 hover:shadow-[0_0_20px_rgba(242,183,5,0.2)] active:scale-95 transition-all duration-200 text-center group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-gradient-to-br from-[#F2B705] to-[#E8890C] flex items-center justify-center text-[#14171A] mb-2.5 shadow-md group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>

            <span className="text-[15px] font-bold text-[#F3F1EA] group-hover:text-white mb-1">
              Upload Video
            </span>
            <span className="text-[11px] text-[#9BA1A8] line-clamp-2 leading-tight">
              Select recorded clip or MP4 file from device
            </span>
          </button>
        </div>

        <div className="mt-2 text-center">
          {!user && (
            <p className="text-[12px] text-[#F2B705] font-medium">
              * Sign in is required to create or upload
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
