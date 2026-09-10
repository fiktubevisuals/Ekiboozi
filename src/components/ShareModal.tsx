import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import {
  FaWhatsapp,
  FaXTwitter,
  FaFacebook,
  FaTelegram,
  FaLinkedinIn,
  FaRedditAlien,
  FaThreads,
  FaEnvelope,
} from 'react-icons/fa6';
import {
  X,
  Share2,
  Copy,
  Check,
  Smartphone,
  Code,
  QrCode,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
  currentTime?: number;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  video,
  currentTime = 0,
}) => {
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'socials' | 'embed' | 'qr'>('socials');

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs <= 0) return '0:00';
    const totalSecs = Math.floor(secs);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formattedCurrentTime = formatTime(currentTime);

  // Compute shareable URL
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  const shareUrl = `${baseUrl}?v=${encodeURIComponent(video.id)}${
    includeTimestamp && currentTime > 1 ? `&t=${Math.floor(currentTime)}` : ''
  }`;

  const embedCode = `<iframe width="560" height="315" src="${shareUrl}" title="${video.title.replace(
    /"/g,
    '&quot;'
  )}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Copy link handler
  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // Copy embed snippet handler
  const handleCopyEmbed = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(embedCode);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = embedCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 3000);
    } catch (err) {
      console.error('Embed copy failed:', err);
    }
  };

  // Social sharing platforms with authentic platform branding & icons
  const socialPlatforms = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: FaWhatsapp,
      bg: 'bg-[#25D366] hover:bg-[#20bd5a] text-white',
      badge: 'Popular',
      action: () => {
        const text = `Watch "${video.title}" by ${video.channel} on Ekiboozi:\n${shareUrl}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      },
    },
    {
      id: 'xtwitter',
      name: 'X',
      icon: FaXTwitter,
      bg: 'bg-[#000000] hover:bg-[#181818] text-white border border-white/20',
      action: () => {
        const text = `Watch "${video.title}" by ${video.channel} on Ekiboozi! 🇺🇬`;
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
          '_blank',
          'noopener,noreferrer'
        );
      },
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: FaFacebook,
      bg: 'bg-[#1877F2] hover:bg-[#166fe5] text-white',
      action: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          '_blank',
          'noopener,noreferrer'
        );
      },
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: FaTelegram,
      bg: 'bg-[#229ED9] hover:bg-[#1e8ec3] text-white',
      action: () => {
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(video.title)}`,
          '_blank',
          'noopener,noreferrer'
        );
      },
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: FaLinkedinIn,
      bg: 'bg-[#0A66C2] hover:bg-[#095196] text-white',
      action: () => {
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          '_blank',
          'noopener,noreferrer'
        );
      },
    },
    {
      id: 'reddit',
      name: 'Reddit',
      icon: FaRedditAlien,
      bg: 'bg-[#FF4500] hover:bg-[#e03d00] text-white',
      action: () => {
        window.open(
          `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(video.title)}`,
          '_blank',
          'noopener,noreferrer'
        );
      },
    },
    {
      id: 'threads',
      name: 'Threads',
      icon: FaThreads,
      bg: 'bg-[#101010] hover:bg-[#202020] text-white border border-white/15',
      action: () => {
        window.open(
          `https://threads.net/intent/post?text=${encodeURIComponent(`Watch "${video.title}" on Ekiboozi: ${shareUrl}`)}`,
          '_blank',
          'noopener,noreferrer'
        );
      },
    },
    {
      id: 'email',
      name: 'Email',
      icon: FaEnvelope,
      bg: 'bg-[#333A41] hover:bg-[#3D454D] text-[#F3F1EA]',
      action: () => {
        const subject = `Check out "${video.title}" on Ekiboozi`;
        const body = `Hey,\n\nI thought you might enjoy this video on Ekiboozi:\n"${video.title}" by ${video.channel}\n\nWatch it here: ${shareUrl}\n`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      },
    },
  ];

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Watch "${video.title}" by ${video.channel} on Ekiboozi`,
          url: shareUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      id="video-share-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="w-full max-w-[560px] bg-[#1E2124] border border-[#333A41] rounded-[20px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#F3F1EA] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        id="video-share-modal-container"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333A41] bg-[#14171A]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#F2B705]/15 flex items-center justify-center text-[#F2B705]">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="share-modal-title" className="text-[17px] font-bold text-[#F3F1EA] leading-tight">
                Share Video
              </h2>
              <p className="text-[11px] text-[#9BA1A8]">
                Share with friends, audiences, or social networks
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262C33] rounded-full transition-colors cursor-pointer"
            aria-label="Close share dialog"
            id="close-share-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview Card */}
        <div className="p-5 pb-0">
          <div className="flex items-center gap-3.5 bg-[#14171A] border border-[#333A41] rounded-[14px] p-3">
            <div className="w-20 aspect-video rounded-lg overflow-hidden bg-[#262C33] flex-shrink-0 relative">
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${video.thumbnailGradient || 'from-amber-600 to-yellow-800'}`} />
              )}
              <span className="absolute bottom-1 right-1 bg-black/85 text-[10px] font-bold text-white px-1 rounded">
                {video.duration || 'Video'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[13.5px] font-bold text-[#F3F1EA] truncate">
                {video.title}
              </h3>
              <p className="text-[12px] text-[#9BA1A8] truncate mt-0.5">
                {video.channel} • {typeof video.views === 'number' ? new Intl.NumberFormat('en-US').format(video.views) : video.views} views
              </p>
            </div>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="px-5 pt-4 pb-1">
          <div className="flex items-center bg-[#14171A] p-1 rounded-xl border border-[#333A41]">
            <button
              type="button"
              onClick={() => setActiveTab('socials')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer ${
                activeTab === 'socials'
                  ? 'bg-[#F2B705] text-[#14171A] shadow-sm font-bold'
                  : 'text-[#9BA1A8] hover:text-[#F3F1EA]'
              }`}
              id="share-tab-socials"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Socials & Apps</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('embed')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer ${
                activeTab === 'embed'
                  ? 'bg-[#F2B705] text-[#14171A] shadow-sm font-bold'
                  : 'text-[#9BA1A8] hover:text-[#F3F1EA]'
              }`}
              id="share-tab-embed"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Embed Code</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-[#F2B705] text-[#14171A] shadow-sm font-bold'
                  : 'text-[#9BA1A8] hover:text-[#F3F1EA]'
              }`}
              id="share-tab-qr"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* TAB 1: SOCIAL PLATFORMS */}
          {activeTab === 'socials' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[12px] font-bold text-[#9BA1A8] uppercase tracking-wider">
                    Share to platforms
                  </span>
                  {hasNativeShare && (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="text-[12px] text-[#F2B705] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      id="system-native-share-btn"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>System Share</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {socialPlatforms.map((platform) => {
                    const IconComp = platform.icon;
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={platform.action}
                        className={`flex flex-col items-center justify-center p-3 rounded-[12px] ${platform.bg} transition-transform active:scale-95 shadow-md cursor-pointer relative group`}
                        id={`share-to-${platform.id}`}
                      >
                        {platform.badge && (
                          <span className="absolute -top-1.5 -right-1.5 bg-[#F2B705] text-[#14171A] text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tight shadow">
                            {platform.badge}
                          </span>
                        )}
                        <div className="w-7 h-7 mb-1 flex items-center justify-center shrink-0">
                          <IconComp size={20} />
                        </div>
                        <span className="text-[12px] font-semibold text-center leading-tight">
                          {platform.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Copy Link Section */}
              <div className="pt-2 border-t border-[#333A41]/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#9BA1A8] uppercase tracking-wider">
                    Copy Link
                  </span>

                  {currentTime > 2 && (
                    <label
                      htmlFor="start-at-timestamp-checkbox"
                      className="flex items-center gap-2 text-[12.5px] text-[#F3F1EA] cursor-pointer select-none hover:text-[#F2B705] transition-colors"
                    >
                      <input
                        type="checkbox"
                        id="start-at-timestamp-checkbox"
                        checked={includeTimestamp}
                        onChange={(e) => setIncludeTimestamp(e.target.checked)}
                        className="rounded border-[#333A41] text-[#F2B705] focus:ring-0 cursor-pointer accent-[#F2B705] w-3.5 h-3.5"
                      />
                      <Clock className="w-3.5 h-3.5 text-[#F2B705]" />
                      <span>Start at <strong className="font-mono text-[#F2B705]">{formattedCurrentTime}</strong></span>
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-[#14171A] border border-[#333A41] rounded-[12px] p-1.5 focus-within:border-[#F2B705] transition-colors">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 bg-transparent border-none text-[13px] text-[#F3F1EA] px-2.5 py-1.5 outline-none font-mono selection:bg-[#F2B705] selection:text-[#14171A]"
                    id="share-link-input"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      copied
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A]'
                    }`}
                    id="copy-video-link-btn"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {copied && (
                  <p className="text-[12px] text-emerald-400 font-medium flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>Link copied to clipboard! Ready to paste.</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EMBED CODE */}
          {activeTab === 'embed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#9BA1A8] uppercase tracking-wider">
                  Embed HTML snippet
                </span>
                <span className="text-[11px] text-[#656C73]">
                  For blogs, web pages, and articles
                </span>
              </div>

              <textarea
                rows={4}
                readOnly
                value={embedCode}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="w-full bg-[#14171A] border border-[#333A41] rounded-[12px] p-3 text-[12px] font-mono text-[#F3F1EA] outline-none focus:border-[#F2B705] resize-none selection:bg-[#F2B705] selection:text-[#14171A]"
                id="share-embed-code-textarea"
              />

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11.5px] text-[#9BA1A8]">
                  Standard 560x315 responsive iframe player.
                </p>
                <button
                  type="button"
                  onClick={handleCopyEmbed}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-[13px] font-bold transition-all cursor-pointer ${
                    embedCopied
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A]'
                  }`}
                  id="copy-embed-code-btn"
                >
                  {embedCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied Snippet!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Embed</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: QR CODE */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center p-2 space-y-4">
              <div className="p-3 bg-white rounded-2xl shadow-xl">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    shareUrl
                  )}&margin=1`}
                  alt="QR Code for Video"
                  className="w-44 h-44 object-contain"
                />
              </div>

              <div className="max-w-xs">
                <h4 className="text-[14px] font-bold text-[#F3F1EA]">
                  Scan to watch on mobile
                </h4>
                <p className="text-[12px] text-[#9BA1A8] mt-1">
                  Point your phone's camera at the QR code to seamlessly continue playback on your phone.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-[#262C33] hover:bg-[#333A41] text-[#F3F1EA] text-[13px] font-semibold rounded-[10px] transition-colors cursor-pointer"
                id="qr-copy-link-btn"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied!' : 'Copy Link Instead'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-[#333A41] bg-[#14171A]/80 flex items-center justify-between text-[12px] text-[#9BA1A8]">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#F2B705]" />
            <span>Ekiboozi Ugandan Video Sharing</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9BA1A8] hover:text-[#F3F1EA] font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
