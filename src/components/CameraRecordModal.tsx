import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Music,
  RotateCcw,
  Sparkles,
  Timer,
  Sliders,
  Wand2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Check,
  Pause,
  Play,
  Mic,
  MicOff,
  AlertCircle,
  RefreshCw,
  Volume2,
  Layers,
  Zap,
  ZapOff,
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface CameraRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (videoFile: File, durationSeconds: number) => void;
}

const TRENDING_SOUNDS = [
  { id: 'sound-none', title: 'Original Sound', artist: 'Camera Microphone', duration: 'Live' },
  { id: 'sound-1', title: 'Kampala Afrobeats Groove', artist: 'Uganda Hits', duration: '0:30' },
  { id: 'sound-2', title: 'Kadodi Festive Drums', artist: 'Eastern Pulse', duration: '0:45' },
  { id: 'sound-3', title: 'Amapiano Sunset Wave', artist: 'DJ Shafik', duration: '0:60' },
  { id: 'sound-4', title: 'Baximba Fusion Rhythm', artist: 'Kampala Studio', duration: '0:35' },
];

export const CameraRecordModal: React.FC<CameraRecordModalProps> = ({
  isOpen,
  onClose,
  onRecordingComplete,
}) => {
  // Camera hardware state
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);

  // Tools & UI options
  const [selectedDurationMode, setSelectedDurationMode] = useState<'10m' | '60s' | '15s' | 'photo'>('60s');
  const [selectedSound, setSelectedSound] = useState(TRENDING_SOUNDS[0]);
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);
  const [isMoreToolsExpanded, setIsMoreToolsExpanded] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'none' | 'beauty' | 'warm' | 'vibrant' | 'mono' | 'vintage'>('none');
  const [timerCountdownSeconds, setTimerCountdownSeconds] = useState<0 | 3 | 10>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'camera' | 'create'>('camera');

  // Recording state
  const [recordingStage, setRecordingStage] = useState<'idle' | 'countdown' | 'recording' | 'paused' | 'review'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isPlayingReview, setIsPlayingReview] = useState(false);

  // Refs
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<any>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Maximum allowed seconds based on duration mode
  const maxDurationSeconds = selectedDurationMode === '10m' ? 600 : selectedDurationMode === '60s' ? 60 : 15;

  const filterStyles: Record<string, string> = {
    none: 'none',
    beauty: 'contrast(1.05) brightness(1.08) saturate(1.15)',
    warm: 'sepia(0.2) saturate(1.25) brightness(1.05)',
    vibrant: 'saturate(1.4) contrast(1.1) brightness(1.03)',
    mono: 'grayscale(1) contrast(1.15)',
    vintage: 'sepia(0.35) contrast(0.95) brightness(0.95)',
  };

  // Enumerate cameras
  const updateDeviceList = useCallback(async () => {
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Failed to enumerate devices:', err);
    }
  }, [selectedDeviceId]);

  // Start device camera
  const startCamera = useCallback(async (forcedDeviceId?: string) => {
    setIsLoadingCamera(true);
    setCameraError(null);

    // Stop existing tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    const deviceIdToUse = forcedDeviceId !== undefined ? forcedDeviceId : selectedDeviceId;

    // Check permissions query if supported by browser
    if (navigator?.permissions?.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (perm && perm.state === 'denied') {
          setIsCameraActive(false);
          setCameraError(
            'Camera permission is blocked in this browser tab. You can choose a video directly from your device or allow camera permissions in your browser.'
          );
          setIsLoadingCamera(false);
          return;
        }
      } catch {
        // Permissions query not supported on this browser
      }
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: deviceIdToUse
          ? { deviceId: { exact: deviceIdToUse }, width: { ideal: 1080 }, height: { ideal: 1920 } }
          : { facingMode: cameraFacing, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: !isMicMuted,
      };

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1: any) {
        // If permission was denied by user, do not spam additional getUserMedia attempts
        if (err1?.name === 'NotAllowedError' || err1?.name === 'PermissionDeniedError') {
          throw err1;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: cameraFacing },
            audio: false,
          });
        } catch {
          // Handled in outer catch
        }
      }

      if (stream) {
        mediaStreamRef.current = stream;
        setIsCameraActive(true);
        setCameraError(null);

        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.muted = true;
          liveVideoRef.current.play().catch(() => {});
        }

        await updateDeviceList();
      } else {
        throw new Error('Unable to start camera stream');
      }
    } catch (err: any) {
      setIsCameraActive(false);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      const isNotFound = err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError';
      setCameraError(
        isDenied
          ? 'Camera permission was not granted. Tap below to upload a video directly from your device, or allow camera permissions in your browser.'
          : isNotFound
          ? 'No camera detected on this device. You can select an existing video from your files.'
          : `Camera could not be started: ${err?.message || 'Check device permissions'}`
      );
    } finally {
      setIsLoadingCamera(false);
    }
  }, [selectedDeviceId, cameraFacing, isMicMuted, updateDeviceList]);

  // Open camera on modal mount
  useEffect(() => {
    if (isOpen) {
      setRecordingStage('idle');
      setRecordedBlob(null);
      setRecordedVideoUrl(null);
      setRecordDuration(0);
      startCamera();
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [isOpen, startCamera]);

  // Countdown handler before recording
  useEffect(() => {
    if (recordingStage === 'countdown') {
      if (countdown > 0) {
        soundFX.playClick();
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
      } else {
        startRecordingNow();
      }
    }
  }, [recordingStage, countdown]);

  // Recording duration timer
  useEffect(() => {
    if (recordingStage === 'recording') {
      durationTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= maxDurationSeconds) {
            stopRecordingNow();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }

    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [recordingStage, maxDurationSeconds]);

  const handleStartRecordingTrigger = () => {
    if (selectedDurationMode === 'photo') {
      handleCapturePhoto();
      return;
    }

    if (timerCountdownSeconds > 0) {
      setCountdown(timerCountdownSeconds);
      setRecordingStage('countdown');
    } else {
      startRecordingNow();
    }
  };

  const startRecordingNow = () => {
    if (!mediaStreamRef.current) return;

    recordedChunksRef.current = [];
    soundFX.playCheer();

    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    let selectedMimeType = '';
    for (const mt of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) {
        selectedMimeType = mt;
        break;
      }
    }

    try {
      const recorder = new MediaRecorder(
        mediaStreamRef.current,
        selectedMimeType ? { mimeType: selectedMimeType } : undefined
      );

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const type = selectedMimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setRecordingStage('review');
        setIsPlayingReview(true);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setRecordDuration(0);
      setRecordingStage('recording');
    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      setCameraError(`Recording failed: ${err.message}`);
      setRecordingStage('idle');
    }
  };

  const stopRecordingNow = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      soundFX.playCountdownBeep();
    }
  };

  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingStage('paused');
    }
  };

  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingStage('recording');
    }
  };

  const handleCapturePhoto = () => {
    if (!liveVideoRef.current) return;
    const video = liveVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (cameraFacing === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `ekiboozi_story_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onRecordingComplete(file, 5);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onRecordingComplete(file, 60);
    }
  };

  const handleRetake = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedBlob(null);
    setRecordedVideoUrl(null);
    setRecordDuration(0);
    setRecordingStage('idle');
    startCamera();
  };

  const handleUseVideo = () => {
    if (!recordedBlob) return;
    const extension = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `story_clip_${Date.now()}.${extension}`;
    const file = new File([recordedBlob], fileName, { type: recordedBlob.type });
    onRecordingComplete(file, recordDuration || 15);
  };

  const handleFlipCamera = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: nextFacing },
        audio: !isMicMuted,
      })
      .then((stream) => {
        mediaStreamRef.current = stream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.play().catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('Flip camera error:', err);
        startCamera();
      });
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[115] bg-black flex items-center justify-center p-0 overflow-hidden select-none">
      {/* Hidden file input for gallery upload */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="video/*,image/*"
        onChange={handleGalleryUpload}
        className="hidden"
      />

      {/* Main Viewport Container */}
      <div className="relative w-full h-full max-w-lg md:max-h-[96vh] md:rounded-[40px] overflow-hidden bg-black flex flex-col justify-between shadow-[0_0_80px_rgba(0,0,0,1)] border md:border-[#333A41]">
        
        {/* ========================================================= */}
        {/* VIEWPORT: REAL CAMERA STREAM OR REVIEW VIDEO */}
        {/* ========================================================= */}
        <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
          {recordingStage === 'review' && recordedVideoUrl ? (
            <video
              ref={reviewVideoRef}
              src={recordedVideoUrl}
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover"
              style={{ filter: filterStyles[selectedFilter] }}
              onPlay={() => setIsPlayingReview(true)}
              onPause={() => setIsPlayingReview(false)}
            />
          ) : (
            <video
              ref={liveVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-transform duration-200 ${
                cameraFacing === 'user' ? 'scale-x-[-1]' : ''
              }`}
              style={{ filter: filterStyles[selectedFilter] }}
            />
          )}

          {/* Vignette shadows for readability of top & bottom controls */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/85 pointer-events-none" />

          {/* Camera Permission / Error Warning */}
          {cameraError && recordingStage !== 'review' && (
            <div className="absolute inset-x-6 top-24 z-30 bg-black/95 backdrop-blur-md border border-amber-500/40 rounded-[24px] p-5 text-center shadow-2xl animate-in fade-in">
              <div className="w-11 h-11 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto mb-2.5">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-white font-bold text-[15px] mb-1">Camera Permission Needed</h4>
              <p className="text-xs text-amber-200/90 leading-relaxed mb-4 max-w-xs mx-auto">
                {cameraError}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#F2B705] hover:bg-[#E8890C] text-[#14171A] font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Choose Video from Files</span>
                </button>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  disabled={isLoadingCamera}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCamera ? 'animate-spin' : ''}`} />
                  <span>{isLoadingCamera ? 'Connecting...' : 'Retry Camera'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 3-2-1 Countdown Overlay */}
          {recordingStage === 'countdown' && (
            <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-center justify-center animate-in fade-in">
              <span className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-[#F2B705] via-[#FF2D55] to-[#F2B705] animate-ping drop-shadow-[0_0_30px_rgba(242,183,5,0.8)]">
                {countdown}
              </span>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* TOP BAR: Close Button + "Add Sound" Pill */}
        {/* ========================================================= */}
        <div className="relative z-20 px-4 pt-4 sm:pt-6 flex items-center justify-between">
          {/* Close button (top-left) */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
            title="Close camera"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Add sound pill (top-center, matching screenshot) */}
          <button
            onClick={() => setIsSoundModalOpen(!isSoundModalOpen)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/45 hover:bg-black/75 backdrop-blur-md border border-white/15 text-white text-[13px] font-semibold transition-all shadow-md active:scale-95 cursor-pointer max-w-[200px] truncate"
            title="Select sound track"
          >
            <Music className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span className="truncate">{selectedSound.title || 'Add sound'}</span>
          </button>

          {/* Right spacer for top bar symmetry */}
          <div className="w-10" />
        </div>

        {/* ========================================================= */}
        {/* RIGHT SIDE VERTICAL TOOLBAR (Matching user's screenshot) */}
        {/* ========================================================= */}
        {recordingStage !== 'review' && (
          <div className="absolute right-3.5 top-18 sm:top-20 z-20 flex flex-col items-center gap-4 py-2">
            {/* 1. Flip Camera */}
            <button
              onClick={handleFlipCamera}
              className="flex flex-col items-center group cursor-pointer text-white"
              title="Flip Camera"
            >
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md group-hover:bg-black/70 flex items-center justify-center border border-white/10 active:rotate-180 transition-all">
                <RotateCcw className="w-5 h-5 text-white" />
              </div>
            </button>

            {/* 2. Beauty / Visual Filter */}
            <button
              onClick={() => {
                const filters: ('none' | 'beauty' | 'warm' | 'vibrant' | 'mono' | 'vintage')[] = [
                  'none',
                  'beauty',
                  'warm',
                  'vibrant',
                  'mono',
                  'vintage',
                ];
                const nextIdx = (filters.indexOf(selectedFilter) + 1) % filters.length;
                setSelectedFilter(filters[nextIdx]);
              }}
              className="flex flex-col items-center group cursor-pointer text-white"
              title={`Filter: ${selectedFilter}`}
            >
              <div
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-all ${
                  selectedFilter !== 'none'
                    ? 'bg-[#F2B705]/80 text-[#14171A] border-[#F2B705]'
                    : 'bg-black/40 text-white border-white/10 group-hover:bg-black/70'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
            </button>

            {/* 3. Timer (Countdown: Off -> 3s -> 10s) */}
            <button
              onClick={() => {
                setTimerCountdownSeconds((prev) => (prev === 0 ? 3 : prev === 3 ? 10 : 0));
              }}
              className="flex flex-col items-center group cursor-pointer text-white"
              title="Timer Countdown"
            >
              <div
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-all relative ${
                  timerCountdownSeconds > 0
                    ? 'bg-[#FF2D55]/80 text-white border-[#FF2D55]'
                    : 'bg-black/40 text-white border-white/10 group-hover:bg-black/70'
                }`}
              >
                <Timer className="w-5 h-5" />
                {timerCountdownSeconds > 0 && (
                  <span className="absolute -bottom-1 -right-1 text-[9px] font-black bg-white text-black px-1 rounded-full">
                    {timerCountdownSeconds}s
                  </span>
                )}
              </div>
            </button>

            {/* 4. Speed / Sliders */}
            <button
              onClick={() => {
                setPlaybackSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 0.5 : 1));
              }}
              className="flex flex-col items-center group cursor-pointer text-white"
              title="Speed"
            >
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md group-hover:bg-black/70 flex items-center justify-center border border-white/10 text-white transition-all">
                <Sliders className="w-4 h-4 text-white" />
              </div>
            </button>

            {/* 5. Filters / Layout Wand */}
            <button
              onClick={() => {
                setSelectedFilter(selectedFilter === 'beauty' ? 'none' : 'beauty');
              }}
              className="flex flex-col items-center group cursor-pointer text-white"
              title="Retouch Beauty"
            >
              <div
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-all ${
                  selectedFilter === 'beauty'
                    ? 'bg-[#FF2D55]/80 text-white border-[#FF2D55]'
                    : 'bg-black/40 text-white border-white/10 group-hover:bg-black/70'
                }`}
              >
                <Wand2 className="w-4 h-4 text-white" />
              </div>
            </button>

            {/* 6. Expand / Collapse Additional Tools */}
            {isMoreToolsExpanded && (
              <>
                {/* Flash toggle */}
                <button
                  onClick={() => setIsFlashActive(!isFlashActive)}
                  className="flex flex-col items-center group cursor-pointer text-white animate-in fade-in"
                  title="Flash / Torch"
                >
                  <div
                    className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-all ${
                      isFlashActive
                        ? 'bg-[#F2B705] text-[#14171A] border-[#F2B705]'
                        : 'bg-black/40 text-white border-white/10 group-hover:bg-black/70'
                    }`}
                  >
                    {isFlashActive ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                  </div>
                </button>

                {/* Mic mute/unmute */}
                <button
                  onClick={() => {
                    if (mediaStreamRef.current) {
                      const audioTracks = mediaStreamRef.current.getAudioTracks();
                      audioTracks.forEach((t) => (t.enabled = isMicMuted));
                    }
                    setIsMicMuted(!isMicMuted);
                  }}
                  className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-all animate-in fade-in cursor-pointer ${
                    isMicMuted
                      ? 'bg-[#E14545]/80 text-white border-[#E14545]'
                      : 'bg-black/40 text-white border-white/10 group-hover:bg-black/70'
                  }`}
                  title={isMicMuted ? 'Mic Muted' : 'Mic On'}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </>
            )}

            {/* Chevron toggle */}
            <button
              onClick={() => setIsMoreToolsExpanded(!isMoreToolsExpanded)}
              className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/70 flex items-center justify-center text-white/80 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              {isMoreToolsExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {/* Sound Selection Dropdown Modal */}
        {isSoundModalOpen && (
          <div className="absolute inset-x-4 top-20 z-40 bg-[#1D2126]/95 backdrop-blur-lg border border-[#333A41] rounded-[24px] p-4 shadow-2xl animate-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#333A41] mb-2">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[#F2B705]" />
                <h4 className="text-sm font-bold text-white">Select Soundtrack</h4>
              </div>
              <button
                onClick={() => setIsSoundModalOpen(false)}
                className="text-white/60 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
              {TRENDING_SOUNDS.map((snd) => (
                <button
                  key={snd.id}
                  onClick={() => {
                    setSelectedSound(snd);
                    setIsSoundModalOpen(false);
                    soundFX.playCheer();
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                    selectedSound.id === snd.id
                      ? 'bg-[#F2B705]/20 text-[#F2B705] border border-[#F2B705]/40'
                      : 'hover:bg-white/5 text-white/90'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold leading-tight">{snd.title}</p>
                    <p className="text-[10px] text-white/50 mt-0.5">{snd.artist}</p>
                  </div>
                  <span className="text-[11px] font-mono opacity-60">{snd.duration}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* BOTTOM AREA: DURATION SELECTOR + SHUTTER + MODE STRIP */}
        {/* ========================================================= */}
        <div className="relative z-20 pb-4 flex flex-col items-center w-full">
          {/* Recording Timer Progress while recording */}
          {(recordingStage === 'recording' || recordingStage === 'paused') && (
            <div className="w-full px-6 mb-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-white mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E14545] animate-ping" />
                  {formatTimer(recordDuration)}
                </span>
                <span className="opacity-70">Max {formatTimer(maxDurationSeconds)}</span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F2B705] to-[#E14545] transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (recordDuration / maxDurationSeconds) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Review Action Screen */}
          {recordingStage === 'review' ? (
            <div className="w-full px-6 py-4 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-4">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3.5 px-4 rounded-full bg-[#1D2126]/90 hover:bg-[#262B31] border border-white/20 text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-4 h-4 text-[#9BA1A8]" />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={handleUseVideo}
                className="flex-[2] py-3.5 px-6 rounded-full bg-gradient-to-r from-[#F2B705] to-[#E8890C] hover:brightness-110 text-[#14171A] font-black text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_0_24px_rgba(242,183,5,0.4)] cursor-pointer"
              >
                <Check className="w-5 h-5 text-[#14171A]" />
                <span>Publish Story</span>
              </button>
            </div>
          ) : (
            <>
              {/* Duration selector pill strip: [10m  60s  15s  PHOTO] (matching user screenshot) */}
              <div className="flex items-center gap-2 mb-4 bg-black/35 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                {(['10m', '60s', '15s', 'photo'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedDurationMode(mode)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      selectedDurationMode === mode
                        ? 'bg-white text-black shadow-md'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {mode === 'photo' ? 'PHOTO' : mode}
                  </button>
                ))}
              </div>

              {/* Shutter Button Row */}
              <div className="w-full px-8 flex items-center justify-between mb-4">
                {/* Left: Device Gallery / Upload Thumbnail */}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-13 h-13 rounded-[16px] bg-[#1D2126]/90 border border-white/25 hover:border-white/60 flex flex-col items-center justify-center text-white transition-transform active:scale-95 cursor-pointer shadow-lg group relative overflow-hidden"
                  title="Upload Video from Gallery"
                >
                  <ImageIcon className="w-5 h-5 text-white/90 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold mt-0.5 text-white/80">Upload</span>
                </button>

                {/* Center: Big Red Shutter Record Button with White Ring */}
                <div className="flex items-center gap-4">
                  {recordingStage === 'recording' || recordingStage === 'paused' ? (
                    <>
                      {/* Pause / Resume */}
                      <button
                        type="button"
                        onClick={
                          recordingStage === 'recording' ? handlePauseRecording : handleResumeRecording
                        }
                        className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer border border-white/20"
                        title={recordingStage === 'recording' ? 'Pause' : 'Resume'}
                      >
                        {recordingStage === 'recording' ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 translate-x-0.5" />
                        )}
                      </button>

                      {/* Stop Recording Red Square */}
                      <button
                        type="button"
                        onClick={stopRecordingNow}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 transition-transform active:scale-95 shadow-[0_0_35px_rgba(225,69,69,0.7)] cursor-pointer group"
                        title="Finish Recording"
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#E14545] group-hover:scale-105 transition-transform" />
                      </button>

                      <div className="w-11" />
                    </>
                  ) : (
                    /* Idle Shutter: Red Circle with White Ring */
                    <button
                      type="button"
                      onClick={() => {
                        if (!isCameraActive) {
                          galleryInputRef.current?.click();
                          return;
                        }
                        handleStartRecordingTrigger();
                      }}
                      className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 transition-transform active:scale-90 hover:scale-105 shadow-[0_0_30px_rgba(225,69,69,0.5)] cursor-pointer group"
                      title={
                        !isCameraActive
                          ? 'Choose Video from Files'
                          : selectedDurationMode === 'photo'
                          ? 'Take Photo'
                          : 'Record Video'
                      }
                    >
                      <div className="w-full h-full rounded-full bg-[#E14545] group-hover:bg-[#FF2D55] transition-colors" />
                    </button>
                  )}
                </div>

                {/* Right: Quick Preset / Filter Avatar */}
                <button
                  type="button"
                  onClick={() => {
                    const filters: ('none' | 'beauty' | 'warm' | 'vibrant' | 'mono' | 'vintage')[] = [
                      'none',
                      'beauty',
                      'warm',
                      'vibrant',
                      'mono',
                      'vintage',
                    ];
                    const nextIdx = (filters.indexOf(selectedFilter) + 1) % filters.length;
                    setSelectedFilter(filters[nextIdx]);
                  }}
                  className="w-13 h-13 rounded-full bg-[#1D2126]/90 border border-white/25 hover:border-[#F2B705] flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg group relative overflow-hidden"
                  title="Cycle Quick Visual Filters"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#F2B705] via-[#FF2D55] to-[#21A8A3] flex items-center justify-center text-white text-[10px] font-bold group-hover:scale-110 transition-transform">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>

              {/* Bottom Mode Strip (matching screenshot: [Upload] CAMERA CREATE) */}
              <div className="flex items-center justify-center gap-7 pt-1 pb-1 text-xs font-bold tracking-wider">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="text-white/60 hover:text-white transition-colors cursor-pointer uppercase"
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBottomTab('camera')}
                  className="text-white font-extrabold uppercase relative after:content-[''] after:block after:w-1.5 after:h-1.5 after:rounded-full after:bg-white after:mx-auto after:mt-1 cursor-pointer"
                >
                  Camera
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="text-white/60 hover:text-white transition-colors cursor-pointer uppercase"
                >
                  Create
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
