import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  Video as VideoIcon,
  VideoOff,
  Mic,
  MicOff,
  RotateCcw,
  Play,
  Pause,
  Square,
  Check,
  RefreshCw,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronDown,
  Timer,
  AlertCircle
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface CameraRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (videoFile: File, durationSeconds: number) => void;
}

export const CameraRecordModal: React.FC<CameraRecordModalProps> = ({
  isOpen,
  onClose,
  onRecordingComplete,
}) => {
  // Camera state
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);

  // Recording state
  const [recordingStage, setRecordingStage] = useState<'idle' | 'countdown' | 'recording' | 'paused' | 'review'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [recordDuration, setRecordDuration] = useState(0);
  const [maxDuration, setMaxDuration] = useState<15 | 60 | 180>(60);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isPlayingReview, setIsPlayingReview] = useState(false);

  // Visual filters
  const [selectedFilter, setSelectedFilter] = useState<'none' | 'warm' | 'vibrant' | 'mono' | 'vintage'>('none');

  // Audio meter
  const [micLevel, setMicLevel] = useState(0);

  // Refs
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const filterStyles: Record<string, string> = {
    none: 'none',
    warm: 'sepia(0.2) saturate(1.25) brightness(1.05)',
    vibrant: 'saturate(1.4) contrast(1.1) brightness(1.03)',
    mono: 'grayscale(1) contrast(1.15)',
    vintage: 'sepia(0.35) contrast(0.95) brightness(0.95)',
  };

  // Enumerate cameras
  const updateDeviceList = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
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

    // Stop existing stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    const deviceIdToUse = forcedDeviceId !== undefined ? forcedDeviceId : selectedDeviceId;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera recording is not supported in this browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: deviceIdToUse
          ? { deviceId: { exact: deviceIdToUse }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: !isMicMuted,
      };

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1) {
        console.warn('Optimal constraints failed, falling back to basic video:', err1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        } catch (err2) {
          console.warn('Audio+video failed, falling back to video only:', err2);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (stream) {
        mediaStreamRef.current = stream;
        setIsCameraActive(true);
        setCameraError(null);

        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.muted = true;
          liveVideoRef.current.play().catch((e) => console.warn('Play error:', e));
        }

        // Setup audio level analyser
        try {
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length > 0) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const ctx = new AudioCtx();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 32;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkMic = () => {
              if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
              }
              animFrameRef.current = requestAnimationFrame(checkMic);
            };
            checkMic();
          }
        } catch (audioErr) {
          console.warn('Audio metering notice:', audioErr);
        }

        await updateDeviceList();
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsCameraActive(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera permissions in your browser address bar to record.'
          : err.name === 'NotFoundError'
          ? 'No camera was found on your device.'
          : `Camera error: ${err.message || 'Unable to access device camera'}`
      );
    } finally {
      setIsLoadingCamera(false);
    }
  }, [selectedDeviceId, cameraFacing, isMicMuted, updateDeviceList]);

  // Initialize camera when modal opens
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
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isOpen, startCamera]);

  // Countdown timer before recording
  useEffect(() => {
    if (recordingStage === 'countdown') {
      if (countdown > 0) {
        soundFX.playClick();
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
      } else {
        // Start actual recording
        startRecordingNow();
      }
    }
  }, [recordingStage, countdown]);

  // Recording duration timer
  useEffect(() => {
    if (recordingStage === 'recording') {
      durationTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= maxDuration) {
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
  }, [recordingStage, maxDuration]);

  const handleStartCountdown = () => {
    setCountdown(3);
    setRecordingStage('countdown');
  };

  const startRecordingNow = () => {
    if (!mediaStreamRef.current) return;

    recordedChunksRef.current = [];
    soundFX.playCheer();

    // Determine supported mimeType
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

      recorder.start(1000); // Collect data every 1s
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
    const fileName = `camera_recording_${Date.now()}.${extension}`;
    const file = new File([recordedBlob], fileName, { type: recordedBlob.type });
    onRecordingComplete(file, recordDuration || 15);
  };

  const handleFlipCamera = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    // Attempt switch
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    navigator.mediaDevices
      .getUserMedia({
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
    <div className="fixed inset-0 z-[115] bg-black/90 backdrop-blur-md flex items-center justify-center p-0 md:p-4 overflow-hidden select-none">
      {/* Container: Fullscreen on mobile, large centered smartphone/cinematic viewport on desktop */}
      <div className="relative w-full h-full max-w-2xl md:h-[92vh] md:max-h-[880px] md:rounded-[36px] overflow-hidden bg-black border border-[#333A41] shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col justify-between">
        
        {/* ========================================== */}
        {/* VIEWPORT: REAL CAMERA STREAM OR REVIEW */}
        {/* ========================================== */}
        <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
          {recordingStage === 'review' && recordedVideoUrl ? (
            /* Review recorded clip */
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
            /* Live Camera Stream */
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

          {/* Vignette / Ambient shadows for top & bottom controls readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/85 pointer-events-none" />

          {/* Camera Permission / Error Fallback Box */}
          {cameraError && recordingStage !== 'review' && (
            <div className="absolute inset-x-6 top-24 z-30 bg-black/85 backdrop-blur-md border border-amber-500/50 rounded-2xl p-4 text-center shadow-2xl animate-in fade-in">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <h4 className="text-white font-bold text-sm mb-1">Camera Permission Required</h4>
              <p className="text-xs text-amber-200/90 leading-relaxed mb-3">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera()}
                disabled={isLoadingCamera}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#F2B705] hover:bg-[#E8890C] text-[#14171A] font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCamera ? 'animate-spin' : ''}`} />
                {isLoadingCamera ? 'Connecting...' : 'Grant / Retry Camera Access'}
              </button>
            </div>
          )}

          {/* 3-2-1 Countdown Overlay */}
          {recordingStage === 'countdown' && (
            <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-center justify-center animate-in fade-in">
              <span className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-[#F2B705] via-[#FF2D55] to-[#F2B705] animate-ping scale-125 drop-shadow-[0_0_30px_rgba(242,183,5,0.8)]">
                {countdown}
              </span>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* TOP BAR: Header controls, Timer & Camera Switcher */}
        {/* ========================================== */}
        <div className="relative z-20 px-4 pt-4 sm:pt-6 flex items-center justify-between">
          {/* Close button */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/80 flex items-center justify-center transition-colors border border-white/10 cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Center Timer / Duration Mode */}
          {recordingStage === 'recording' || recordingStage === 'paused' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-[#E14545]/60 shadow-lg">
              <span className={`w-2.5 h-2.5 rounded-full bg-[#E14545] ${recordingStage === 'recording' ? 'animate-ping' : ''}`} />
              <span className="font-mono text-sm font-black text-white">
                {formatTimer(recordDuration)}
              </span>
              <span className="text-[11px] text-[#9BA1A8]">/ {formatTimer(maxDuration)}</span>
            </div>
          ) : recordingStage === 'review' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-lg">
              <Check className="w-3.5 h-3.5" />
              <span>Preview Ready ({formatTimer(recordDuration)})</span>
            </div>
          ) : (
            /* Max duration selector pills */
            <div className="flex items-center bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/10">
              {([15, 60, 180] as const).map((secs) => (
                <button
                  key={secs}
                  onClick={() => setMaxDuration(secs)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    maxDuration === secs
                      ? 'bg-[#F2B705] text-[#14171A] shadow'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {secs === 180 ? '3m' : `${secs}s`}
                </button>
              ))}
            </div>
          )}

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2">
            {recordingStage !== 'review' && (
              <>
                {/* Flip camera */}
                <button
                  onClick={handleFlipCamera}
                  className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 flex items-center justify-center transition-transform active:rotate-180 border border-white/10 cursor-pointer"
                  title="Flip Camera (Front/Rear)"
                >
                  <RotateCcw className="w-5 h-5" />
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
                  className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-colors border cursor-pointer ${
                    isMicMuted
                      ? 'bg-[#E14545]/80 text-white border-[#E14545]'
                      : 'bg-black/60 text-white border-white/10 hover:bg-black/80'
                  }`}
                  title={isMicMuted ? 'Microphone Muted' : 'Microphone Active'}
                >
                  {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* RECORDING PROGRESS BAR */}
        {/* ========================================== */}
        {(recordingStage === 'recording' || recordingStage === 'paused') && (
          <div className="relative z-20 px-4 mt-2">
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F2B705] to-[#E14545] transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, (recordDuration / maxDuration) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SIDE BAR / FLOATING UTILITIES (Filters & Devices) */}
        {/* ========================================== */}
        {recordingStage === 'idle' && (
          <div className="relative z-20 px-4 flex justify-between items-end">
            {/* Camera device picker if multiple cameras found */}
            {cameras.length > 1 && (
              <div className="bg-black/60 backdrop-blur-md rounded-2xl p-2 border border-white/10 max-w-[200px]">
                <label className="text-[10px] text-white/70 font-semibold block mb-1">
                  Camera Lens
                </label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    startCamera(e.target.value);
                  }}
                  className="w-full bg-[#1D2126] text-white text-xs rounded-lg px-2 py-1.5 border border-white/15 focus:outline-none focus:border-[#F2B705] cursor-pointer"
                >
                  {cameras.map((c, i) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter pills */}
            <div className="ml-auto flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/10 overflow-x-auto max-w-full">
              {(['none', 'warm', 'vibrant', 'mono', 'vintage'] as const).map((filterId) => (
                <button
                  key={filterId}
                  onClick={() => setSelectedFilter(filterId)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize transition-colors cursor-pointer whitespace-nowrap ${
                    selectedFilter === filterId
                      ? 'bg-[#F2B705] text-[#14171A]'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {filterId}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* BOTTOM CONTROLS: RECORD / PAUSE / REVIEW ACTIONS */}
        {/* ========================================== */}
        <div className="relative z-20 px-6 pb-6 pt-4 flex flex-col items-center">
          {recordingStage === 'review' ? (
            /* Review Screen Action Bar */
            <div className="w-full flex items-center justify-between gap-4">
              {/* Retake */}
              <button
                onClick={handleRetake}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-[#1D2126]/90 hover:bg-[#262B31] border border-white/20 text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-4 h-4 text-[#9BA1A8]" />
                <span>Retake</span>
              </button>

              {/* Use Video & Continue to Post */}
              <button
                onClick={handleUseVideo}
                className="flex-[2] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#F2B705] to-[#E8890C] hover:brightness-110 text-[#14171A] font-black text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_0_24px_rgba(242,183,5,0.4)] cursor-pointer"
              >
                <Check className="w-5 h-5 text-[#14171A]" />
                <span>Use Video & Add Details</span>
              </button>
            </div>
          ) : (
            /* Recording Trigger Area */
            <div className="w-full flex items-center justify-around">
              {/* Mic volume meter */}
              <div className="w-12 flex flex-col items-center gap-1">
                <div className="w-2 h-10 bg-white/20 rounded-full overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full bg-emerald-400 rounded-full transition-all duration-75"
                    style={{ height: `${micLevel}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-white/70">MIC</span>
              </div>

              {/* Central Big Record / Pause / Stop Buttons */}
              <div className="flex items-center gap-6">
                {recordingStage === 'recording' || recordingStage === 'paused' ? (
                  <>
                    {/* Pause / Resume button */}
                    <button
                      onClick={recordingStage === 'recording' ? handlePauseRecording : handleResumeRecording}
                      className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer border border-white/20"
                      title={recordingStage === 'recording' ? 'Pause' : 'Resume'}
                    >
                      {recordingStage === 'recording' ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 translate-x-0.5" />
                      )}
                    </button>

                    {/* Big Stop Square Button */}
                    <button
                      onClick={stopRecordingNow}
                      className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 transition-transform active:scale-95 shadow-[0_0_30px_rgba(225,69,69,0.5)] cursor-pointer group"
                      title="Stop Recording"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#E14545] group-hover:scale-105 transition-transform" />
                    </button>

                    {/* Placeholder for symmetry */}
                    <div className="w-12" />
                  </>
                ) : (
                  /* Idle: Giant Red Record Button */
                  <button
                    onClick={handleStartCountdown}
                    disabled={!isCameraActive || isLoadingCamera}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 transition-transform active:scale-90 hover:scale-105 shadow-[0_0_30px_rgba(225,69,69,0.4)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                    title="Tap to Record"
                  >
                    <div className="w-full h-full rounded-full bg-[#E14545] group-hover:bg-[#FF2D55] transition-colors" />
                  </button>
                )}
              </div>

              {/* Status Badge */}
              <div className="w-12 text-center">
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider block">
                  {isCameraActive ? 'HD Ready' : 'Standby'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
