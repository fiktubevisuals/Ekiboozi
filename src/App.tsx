/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Video, Creator, NavView, Comment, HeroCarouselItem, Campaign, Job, FooterSettings, TermsSettings, WatchHistory, JobApplication } from './types';
import { collection, onSnapshot, doc, setDoc, updateDoc, increment, arrayUnion, arrayRemove, query, where, addDoc, getDocs } from 'firebase/firestore';
import { signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { db, auth, googleProvider } from './lib/firebase';
import { getClientId, formatSubscriberCount, formatRelativeTime, getTimeMillis } from './utils/dateUtils';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryRail } from './components/CategoryRail';
import { CreatorsRail } from './components/CreatorsRail';
import { VideoCard } from './components/VideoCard';
import { VideoCardSkeleton } from './components/VideoCardSkeleton';
import { AdBanner } from './components/AdBanner';
import { SupportView } from './components/SupportView';
import { CreatorProfileView } from './components/CreatorProfileView';
import { MiniPlayer } from './components/MiniPlayer';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { UploadModal } from './components/UploadModal';
import { CreateActionModal } from './components/CreateActionModal';
import { CameraRecordModal } from './components/CameraRecordModal';
import { UserProfileModal } from './components/UserProfileModal';
import { MyUploadsModal } from './components/MyUploadsModal';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { AdminDashboard } from './components/AdminDashboard';
import { JobsView } from "./components/JobsView";
import { JobDetailsView } from './components/JobDetailsView';
import { TermsView } from './components/TermsView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { CookieBanner } from './components/CookieBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { deleteDoc as deleteFirestoreDoc } from 'firebase/firestore';
import { Film, ShieldCheck, CheckCircle2, AlertTriangle, X, Radio, Sparkles } from 'lucide-react';
import { DEFAULT_FOOTER_SETTINGS, DEFAULT_TERMS_SETTINGS } from './constants/legalDefaults';
import { verifyAndRecordDonation } from './services/paymentService';
import { useVideoSeo } from './hooks/useVideoSeo';

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('For you');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Core reactive data state with instant local cache hydration
  const [creators, setCreators] = useState<Creator[]>(() => {
    try {
      const c = localStorage.getItem('ekiboozi_creators_cache');
      return c ? JSON.parse(c) : [];
    } catch {
      return [];
    }
  });
  const [videos, setVideos] = useState<Video[]>(() => {
    try {
      const v = localStorage.getItem('ekiboozi_videos_cache');
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });
  const [heroItems, setHeroItems] = useState<HeroCarouselItem[]>(() => {
    try {
      const h = localStorage.getItem('ekiboozi_hero_cache');
      if (h) {
        const parsed = JSON.parse(h);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  });
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [footerSettings, setFooterSettings] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
  const [termsSettings, setTermsSettings] = useState<TermsSettings>(DEFAULT_TERMS_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbReady, setIsDbReady] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const viewedSessionRef = useRef<Set<string>>(new Set());

  // Global Payment Verification Modal state
  const [paymentNotice, setPaymentNotice] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // Global payment callback handler (e.g. from Pesapal redirects)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackingId = params.get('OrderTrackingId') || params.get('order_tracking_id');
    if (trackingId) {
      // Clean query string immediately so refresh doesn't re-trigger
      window.history.replaceState({}, document.title, window.location.pathname);

      (async () => {
        try {
          const res = await verifyAndRecordDonation(trackingId);
          if (res.isCompleted) {
            setPaymentNotice({
              type: 'success',
              title: 'Payment Completed & Recorded!',
              message: res.amount 
                ? `Your contribution of UGX ${new Intl.NumberFormat('en-US').format(res.amount)} has been verified and officially added to the campaign goal.`
                : 'Your payment was successfully confirmed and recorded.'
            });
          } else {
            setPaymentNotice({
              type: 'error',
              title: 'Payment Not Completed',
              message: `Payment status: "${res.status || 'Pending'}". Uncompleted payments are strictly never recorded to prevent false public totals.`
            });
          }
        } catch (err: any) {
          console.warn('Payment verification error:', err);
          setPaymentNotice({
            type: 'error',
            title: 'Payment Incomplete',
            message: 'Payment was not completed. Nothing has been added to the campaign goal.'
          });
        }
      })();
    }
  }, []);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    setIsDbReady(true);

    const unsubJobs = onSnapshot(collection(db, 'jobs'), (snap) => {
      const j: Job[] = [];
      snap.forEach(d => j.push({ id: d.id, ...d.data() } as Job));
      j.sort((a, b) => {
        const aT = a.createdAt || '';
        const bT = b.createdAt || '';
        return bT.localeCompare(aT);
      });
      setJobs(j);
    }, (err) => console.warn('Jobs listener warning:', err));

    const unsubCampaigns = onSnapshot(collection(db, 'campaigns'), (snap) => {
      const camps: Campaign[] = [];
      snap.forEach(d => camps.push({ id: d.id, ...d.data() } as Campaign));
      camps.sort((a, b) => {
        const aT = a.createdAt || '';
        const bT = b.createdAt || '';
        return bT.localeCompare(aT);
      });
      setCampaigns(camps);
    }, (err) => console.warn('Campaigns listener warning:', err));

    const unsubHero = onSnapshot(collection(db, 'hero_items'), (snap) => {
      const items: HeroCarouselItem[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() } as HeroCarouselItem));
      items.sort((a, b) => {
        const aT = a.createdAt || '';
        const bT = b.createdAt || '';
        return bT.localeCompare(aT);
      });
      setHeroItems(items);
      try {
        localStorage.setItem('ekiboozi_hero_cache', JSON.stringify(items));
      } catch {
        // ignore quota
      }
    }, (err) => console.warn('Hero items listener warning:', err));

    const clientId = user?.uid || getClientId();

    const unsubVideos = onSnapshot(collection(db, 'videos'), (snap) => {
      const vids: Video[] = [];
      const seenIds = new Set<string>();

      snap.forEach(d => {
        const data = d.data();
        const docId = d.id;
        const payloadId = (data as any).id;
        const customId = payloadId || docId;
        if (!docId || seenIds.has(docId)) {
          return;
        }
        seenIds.add(docId);

        const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
        const isLiked = likedBy.includes(clientId);
        const viewsCount = typeof data.viewsCount === 'number' ? data.viewsCount : (parseInt(data.views) || 0);
        const likes = typeof data.likes === 'number' ? data.likes : likedBy.length;

        vids.push({
          ...data,
          id: docId,
          customId,
          viewsCount,
          views: `${viewsCount}`,
          likes,
          likedBy,
          isLiked,
        } as Video);
      });
      
      // Sort by upload/published date (newest first) safely
      vids.sort((a, b) => {
        const aT = getTimeMillis((a as any).createdAt || (a as any).publishedAt || a.timestamp);
        const bT = getTimeMillis((b as any).createdAt || (b as any).publishedAt || b.timestamp);
        return bT - aT;
      });
      setVideos(vids);
      setIsLoading(false);
      try {
        localStorage.setItem('ekiboozi_videos_cache', JSON.stringify(vids.slice(0, 40)));
      } catch {
        // ignore quota
      }
    }, (err) => {
      console.warn('Videos listener warning:', err);
      setIsLoading(false);
    });

    const unsubCreators = onSnapshot(collection(db, 'creators'), (snap) => {
      const crts: Creator[] = [];
      snap.forEach(d => {
        const data = d.data();
        const subList: string[] = Array.isArray(data.subscribersList) ? data.subscribersList : [];
        const count = typeof data.subscribersCount === 'number'
          ? data.subscribersCount
          : (subList.length || (parseInt(data.subscribers) || 0));
        const isFollowed = subList.includes(clientId);

        crts.push({
          id: d.id,
          ...data,
          subscribersCount: count,
          subscribers: formatSubscriberCount(count),
          subscribersList: subList,
          isFollowed,
        } as Creator);
      });
      setCreators(crts);
      try {
        localStorage.setItem('ekiboozi_creators_cache', JSON.stringify(crts));
      } catch {
        // ignore quota
      }
    }, (err) => console.warn('Creators listener warning:', err));

    const unsubComments = onSnapshot(collection(db, 'comments'), (snap) => {
      const cmap: Record<string, Comment[]> = {};
      snap.forEach(d => {
        const c = { id: d.id, ...d.data() } as Comment & { videoId: string; createdAt?: string };
        if (!cmap[c.videoId]) cmap[c.videoId] = [];
        cmap[c.videoId].push(c);
      });
      Object.keys(cmap).forEach(vid => {
        cmap[vid].sort((a: any, b: any) => {
          return getTimeMillis(b.createdAt) - getTimeMillis(a.createdAt);
        });
      });
      setCommentsMap(cmap);
    }, (err) => console.warn('Comments listener warning:', err));

    const unsubFooter = onSnapshot(doc(db, 'footer_settings', 'main'), (snap) => {
      if (snap.exists()) {
        setFooterSettings(snap.data() as FooterSettings);
      } else {
        setFooterSettings(DEFAULT_FOOTER_SETTINGS);
      }
    }, (err) => console.warn('Footer settings listener warning:', err));

    const unsubTerms = onSnapshot(doc(db, 'terms_settings', 'main'), (snap) => {
      if (snap.exists()) {
        setTermsSettings(snap.data() as TermsSettings);
      } else {
        setTermsSettings(DEFAULT_TERMS_SETTINGS);
      }
    }, (err) => console.warn('Terms settings listener warning:', err));

    return () => {
      unsubHero();
      unsubJobs();
      unsubCampaigns();
      unsubVideos();
      unsubCreators();
      unsubComments();
      unsubFooter();
      unsubTerms();
    };
  }, []);

  // Playback and Mini-Player state
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  // Dynamic Open Graph, Twitter Cards, and Schema.org VideoObject JSON-LD for AdSense discoverability
  useVideoSeo(activeVideo);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateChoiceOpen, setIsCreateChoiceOpen] = useState(false);
  const [isRecordCameraOpen, setIsRecordCameraOpen] = useState(false);
  const [recordedCameraFile, setRecordedCameraFile] = useState<File | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMyUploadsOpen, setIsMyUploadsOpen] = useState(false);

  const userUploadsCount = useMemo(() => {
    if (!user) return 0;
    return videos.filter(
      (v) =>
        v.creatorId === user.uid ||
        (user.email && v.channel === (user.displayName || user.email.split('@')[0]))
    ).length;
  }, [videos, user]);

  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);

  useEffect(() => {
    const clientId = user?.uid || getClientId();
    if (clientId) {
      const q = query(collection(db, 'watch_history'), where('userId', '==', clientId));
      return onSnapshot(q, (snap) => {
        const history: WatchHistory[] = [];
        snap.forEach(d => history.push({ id: d.id, ...d.data() } as WatchHistory));
        setWatchHistory(history);
      }, (err) => {
        console.warn('Watch history listener warning:', err);
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'job_applications'), where('userId', '==', user.uid));
      return onSnapshot(q, (snap) => {
        const apps: JobApplication[] = [];
        snap.forEach(d => apps.push({ id: d.id, ...d.data() } as JobApplication));
        setJobApplications(apps);
      }, (err) => {
        console.warn('Job applications listener warning:', err);
      });
    } else {
      setJobApplications([]);
    }
  }, [user]);

  const [isApplying, setIsApplying] = useState(false);

  // Global playback timer
  React.useEffect(() => {
    if (!activeVideo || !isPlaying) return;
    if (activeVideo.videoUrl) return; // real video manages time

    const interval = setInterval(() => {
      setPlaybackProgress((prev) => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, activeVideo]);

  const handleApplyJob = async (jobId: string) => {
    if (!user) {
      alert("Please sign in to apply.");
      return;
    }
    setIsApplying(true);
    try {
      await addDoc(collection(db, 'job_applications'), {
        userId: user.uid,
        jobId,
        status: 'Submitted',
        appliedAt: new Date().toISOString()
      });
      alert("Application submitted successfully!");
    } catch (error) {
      console.error("Error applying:", error);
      alert("Failed to apply.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleVideoUpdated = (updatedVideo: Video) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === updatedVideo.id ? { ...v, ...updatedVideo } : v))
    );
  };

  const handleStartPlaying = (video: Video) => {

    // Record progress of activeVideo first
    if (activeVideo) {
      recordWatchHistory(activeVideo.id, playbackProgress);
    }

    if (activeVideo?.id !== video.id) {
      setActiveVideo(video);
      // Fetch new video's progress if available
      const historyRecord = watchHistory.find(h => h.videoId === video.id);
      setPlaybackProgress(historyRecord?.playbackTimestamp || 0);
      setIsPlaying(true);
    }
    setIsMiniPlayer(false);

    // Record real view increment in Firestore (at most once per video per user session)
    const clientId = user?.uid || getClientId();
    if (!viewedSessionRef.current.has(video.id) && !video.viewedBy?.includes(clientId)) {
      viewedSessionRef.current.add(video.id);
      const videoRef = doc(db, 'videos', video.id);
      const newCount = (video.viewsCount || 0) + 1;

      // Optimistic update for instant UI feedback
      setVideos((prev) =>
        prev.map((item) =>
          item.id === video.id
            ? { ...item, viewsCount: newCount, views: `${newCount}`, viewedBy: [...(item.viewedBy || []), clientId] }
            : item
        )
      );
      if (activeVideo?.id === video.id) {
        setActiveVideo((prev) =>
          prev ? { ...prev, viewsCount: newCount, views: `${newCount}`, viewedBy: [...(prev.viewedBy || []), clientId] } : null
        );
      }

      updateDoc(videoRef, {
        viewsCount: increment(1),
        views: `${newCount}`,
        viewedBy: arrayUnion(clientId),
      }).catch((err) => console.warn('Could not record view increment:', err));
    }
  };

  const recordWatchHistory = async (videoId: string, timestamp: number) => {
    const clientId = user?.uid || getClientId();
    if (!clientId) return;
    
    // Check if already watched
    const existing = watchHistory.find(h => h.videoId === videoId);
    
    if (existing) {
       // Update
       const ref = doc(db, 'watch_history', existing.id);
       await updateDoc(ref, {
         watchedAt: new Date().toISOString(),
         playbackTimestamp: timestamp
       });
    } else {
      // Create
      await addDoc(collection(db, 'watch_history'), {
        userId: clientId,
        videoId,
        watchedAt: new Date().toISOString(),
        playbackTimestamp: timestamp
      });
    }
  };

  // Check for deep-linked video in URL parameters (?v=... or ?video=...)
  useEffect(() => {
    if (videos.length > 0 && !activeVideo) {
      const params = new URLSearchParams(window.location.search);
      const vId = params.get('v') || params.get('video');
      if (vId) {
        const found = videos.find((v) => v.id === vId);
        if (found) {
          handleStartPlaying(found);
        }
      }
    }
  }, [videos]);

  const handleCloseVideo = () => {
    setActiveVideo(null);
    setIsMiniPlayer(false);
    const params = new URLSearchParams(window.location.search);
    if (params.has('v') || params.has('video') || params.has('t')) {
      params.delete('v');
      params.delete('video');
      params.delete('t');
      const newQuery = params.toString();
      window.history.replaceState(null, '', newQuery ? `?${newQuery}` : window.location.pathname);
    }
  };

  const handleViewCreatorProfile = (creatorId: string | null) => {
    if (creatorId) {
      setSelectedCreatorId(creatorId);
      setCurrentView('creator_profile');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setSelectedCreatorId(null);
      setCurrentView('home');
    }
  };

  // Handle global search
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query && currentView === 'creator_profile') {
      setCurrentView('home');
      setSelectedCreatorId(null);
    }
  };

  // Toggle follow/unfollow for a creator with real persistent subscriber tracking
  const handleToggleFollow = async (creatorId: string) => {
    if (!user) {
      alert("Please sign in to subscribe.");
      return;
    }
    const creator = creators.find((c) => c.id === creatorId);
    if (!creator) return;

    const clientId = user.uid;
    const subList: string[] = Array.isArray(creator.subscribersList) ? [...creator.subscribersList] : [];
    const isCurrentlySubbed = subList.includes(clientId) || Boolean(creator.isFollowed);
    const creatorRef = doc(db, 'creators', creatorId);

    const currentCount = typeof creator.subscribersCount === 'number'
      ? creator.subscribersCount
      : (subList.length || (parseInt(creator.subscribers || '0') || 0));

    if (isCurrentlySubbed) {
      const newCount = Math.max(0, currentCount - 1);
      const updatedList = subList.filter((id) => id !== clientId);

      // Optimistic update
      setCreators((prev) =>
        prev.map((c) =>
          c.id === creatorId
            ? {
                ...c,
                isFollowed: false,
                subscribersCount: newCount,
                subscribers: formatSubscriberCount(newCount),
                subscribersList: updatedList,
              }
            : c
        )
      );

      await updateDoc(creatorRef, {
        subscribersList: arrayRemove(clientId),
        subscribersCount: newCount,
        subscribers: formatSubscriberCount(newCount),
        isFollowed: false,
      });
    } else {
      const newCount = currentCount + 1;
      const updatedList = [...subList, clientId];

      // Optimistic update
      setCreators((prev) =>
        prev.map((c) =>
          c.id === creatorId
            ? {
                ...c,
                isFollowed: true,
                subscribersCount: newCount,
                subscribers: formatSubscriberCount(newCount),
                subscribersList: updatedList,
              }
            : c
        )
      );

      await updateDoc(creatorRef, {
        subscribersList: arrayUnion(clientId),
        subscribersCount: newCount,
        subscribers: formatSubscriberCount(newCount),
        isFollowed: true,
      });
    }
  };

  // Toggle like on a video with real persistent like tracking
  const handleToggleLike = async (videoId: string) => {
    if (!user) {
      alert("Please sign in to like videos.");
      return;
    }
    const v = videos.find((v) => v.id === videoId);
    if (!v) return;

    const clientId = user.uid;
    const likedByList: string[] = Array.isArray(v.likedBy) ? [...v.likedBy] : [];
    const isCurrentlyLiked = likedByList.includes(clientId) || Boolean(v.isLiked);
    const videoRef = doc(db, 'videos', videoId);

    if (isCurrentlyLiked) {
      const newLikes = Math.max(0, (v.likes || 1) - 1);
      const newLikedBy = likedByList.filter((id) => id !== clientId);

      // Optimistic update
      setVideos((prev) =>
        prev.map((item) =>
          item.id === videoId
            ? { ...item, isLiked: false, likes: newLikes, likedBy: newLikedBy }
            : item
        )
      );
      if (activeVideo?.id === videoId) {
        setActiveVideo((prev) =>
          prev ? { ...prev, isLiked: false, likes: newLikes, likedBy: newLikedBy } : null
        );
      }

      await updateDoc(videoRef, {
        likedBy: arrayRemove(clientId),
        likes: newLikes,
        isLiked: false,
      });
    } else {
      const newLikes = (v.likes || 0) + 1;
      const newLikedBy = [...likedByList, clientId];

      // Optimistic update
      setVideos((prev) =>
        prev.map((item) =>
          item.id === videoId
            ? { ...item, isLiked: true, likes: newLikes, likedBy: newLikedBy }
            : item
        )
      );
      if (activeVideo?.id === videoId) {
        setActiveVideo((prev) =>
          prev ? { ...prev, isLiked: true, likes: newLikes, likedBy: newLikedBy } : null
        );
      }

      await updateDoc(videoRef, {
        likedBy: arrayUnion(clientId),
        likes: newLikes,
        isLiked: true,
      });
    }
  };

  // Add new comment
  const handleAddComment = async (videoId: string, text: string) => {
    if (!user) {
      alert("Please sign in to comment.");
      return;
    }
    const newCommentId = `c-${Date.now()}`;
    const ref = doc(db, 'comments', newCommentId);
    
    const authorName = user?.displayName || user?.email || 'Anonymous';
    const authorInitials = authorName.charAt(0).toUpperCase();

    const commentData: any = {
      id: newCommentId,
      videoId,
      author: authorName,
      authorInitials,
      avatarGradient: user?.photoURL ? '' : 'from-[#21A8A3] to-[#157A76]',
      text,
      timestamp: 'Just now',
      likes: 0,
      createdAt: new Date().toISOString()
    };
    
    if (user?.photoURL) commentData.avatarUrl = user.photoURL;

    await setDoc(ref, commentData);

    const v = videos.find(v => v.id === videoId);
    if (v) {
      await updateDoc(doc(db, 'videos', videoId), {
        commentsCount: v.commentsCount + 1
      });
    }
  };

  // Upload video
  const handleUploadSuccess = async (newVideo: Video) => {
    const ref = doc(db, 'videos', newVideo.id);
    const nowIso = new Date().toISOString();
    const videoPayload: Video = {
      ...newVideo,
      creatorId: user ? user.uid : newVideo.creatorId,
      uploadedByUid: user?.uid || newVideo.uploadedByUid || '',
      userEmail: user?.email || newVideo.userEmail || '',
      createdAt: newVideo.createdAt || nowIso,
      publishedAt: newVideo.publishedAt || nowIso,
      timestamp: formatRelativeTime(nowIso),
      viewsCount: 0,
      views: '0',
      likes: 0,
      likedBy: [],
      isLiked: false,
      commentsCount: 0,
    };
    await setDoc(ref, videoPayload);

    // Ensure creator profile is synced in Firestore
    const creatorRef = doc(db, 'creators', newVideo.creatorId);
    const existing = creators.find((c) => c.id === newVideo.creatorId);
    const existingSubsCount = typeof existing?.subscribersCount === 'number'
      ? existing.subscribersCount
      : (Array.isArray(existing?.subscribersList) ? existing.subscribersList.length : 0);

    const creatorData: Creator = {
      id: newVideo.creatorId,
      name: newVideo.channel,
      initials: newVideo.channelInitials || 'CR',
      avatarGradient: newVideo.channelAvatar || 'from-[#F2B705] to-[#E8890C]',
      avatarUrl: newVideo.channelAvatarUrl || user?.photoURL || undefined,
      subscribers: formatSubscriberCount(existingSubsCount),
      subscribersCount: existingSubsCount,
      subscribersList: existing?.subscribersList || [],
      isFollowed: existing ? existing.isFollowed : false,
      bio: existing?.bio || 'Content creator on Ekiboozi.',
      videosCount: (existing?.videosCount || 0) + 1,
      featuredTopic: newVideo.category || 'Creator',
      createdAt: existing?.createdAt || nowIso,
    };
    await setDoc(creatorRef, creatorData, { merge: true });
    
    setCurrentView('home');
    setSelectedCategory('For you');
  };

  // Directly open camera recording studio on upload action
  const handleOpenUploadAction = async () => {
    if (!user) {
      try {
        await signInWithPopup(auth, googleProvider);
        setIsRecordCameraOpen(true);
      } catch (err) {
        console.warn('Sign in for upload error:', err);
      }
      return;
    }
    setIsRecordCameraOpen(true);
  };

  const handleDeleteVideo = async (videoId: string) => {
    // 1. Identify target video and resolve all potential Firestore document IDs
    const targetVideo = videos.find((v) => v.id === videoId || v.customId === videoId);
    const docId = targetVideo?.id || videoId;
    const customId = targetVideo?.customId;

    // 2. Optimistically update local state immediately
    setVideos((prev) =>
      prev.filter((v) => v.id !== videoId && v.id !== docId && (!customId || v.customId !== customId))
    );
    if (activeVideo?.id === videoId || activeVideo?.id === docId || activeVideo?.customId === videoId) {
      setActiveVideo(null);
      setIsMiniPlayer(false);
    }

    // 3. Clear from local storage cache immediately
    try {
      const cached = localStorage.getItem('ekiboozi_videos_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        const filtered = parsed.filter(
          (v: any) => v.id !== videoId && v.id !== docId && (!customId || v.customId !== customId)
        );
        localStorage.setItem('ekiboozi_videos_cache', JSON.stringify(filtered));
      }
    } catch {
      // ignore
    }

    // 4. Delete permanently from Firestore:
    // A) Delete by docId directly
    try {
      await deleteFirestoreDoc(doc(db, 'videos', docId));
    } catch (err) {
      console.warn("Direct doc deletion error for docId:", docId, err);
    }

    // B) Delete by customId if distinct
    if (customId && customId !== docId) {
      try {
        await deleteFirestoreDoc(doc(db, 'videos', customId));
      } catch (err) {
        console.warn("Direct doc deletion error for customId:", customId, err);
      }
    }

    // C) Query delete by field 'id' == videoId to ensure no document is left behind
    try {
      const q = query(collection(db, 'videos'), where('id', '==', videoId));
      const qSnap = await getDocs(q);
      const promises = qSnap.docs.map((d) => deleteFirestoreDoc(d.ref));
      await Promise.all(promises);
    } catch (err) {
      console.warn("Query deletion by field 'id' error:", err);
    }

    // D) Also delete any associated hero items
    try {
      const qHero = query(collection(db, 'hero_items'), where('linkedVideoId', '==', videoId));
      const heroSnap = await getDocs(qHero);
      await Promise.all(heroSnap.docs.map((d) => deleteFirestoreDoc(d.ref)));
    } catch {
      // ignore
    }

    // E) Also delete any comments for this video
    try {
      const qComments = query(collection(db, 'comments'), where('videoId', '==', videoId));
      const commentsSnap = await getDocs(qComments);
      await Promise.all(commentsSnap.docs.map((d) => deleteFirestoreDoc(d.ref)));
    } catch {
      // ignore
    }

    // F) Also delete watch history records for this video
    try {
      const qHistory = query(collection(db, 'watch_history'), where('videoId', '==', videoId));
      const historySnap = await getDocs(qHistory);
      await Promise.all(historySnap.docs.map((d) => deleteFirestoreDoc(d.ref)));
    } catch {
      // ignore
    }

    // G) Decrement creator's videosCount if applicable
    if (targetVideo?.creatorId) {
      try {
        const creatorRef = doc(db, 'creators', targetVideo.creatorId);
        await updateDoc(creatorRef, {
          videosCount: increment(-1),
        });
      } catch {
        // ignore
      }
    }
  };

  const handleDeleteCreator = async (creatorId: string) => {
    // 1. Optimistically update state
    setCreators((prev) => prev.filter((c) => c.id !== creatorId));
    setVideos((prev) => prev.filter((v) => v.creatorId !== creatorId));
    if (activeVideo?.creatorId === creatorId) {
      setActiveVideo(null);
      setIsMiniPlayer(false);
    }
    // 2. Clear from local cache
    try {
      const cCached = localStorage.getItem('ekiboozi_creators_cache');
      if (cCached) {
        const parsed = JSON.parse(cCached);
        localStorage.setItem('ekiboozi_creators_cache', JSON.stringify(parsed.filter((c: any) => c.id !== creatorId)));
      }
      const vCached = localStorage.getItem('ekiboozi_videos_cache');
      if (vCached) {
        const parsed = JSON.parse(vCached);
        localStorage.setItem('ekiboozi_videos_cache', JSON.stringify(parsed.filter((v: any) => v.creatorId !== creatorId)));
      }
    } catch {
      // ignore
    }
    // 3. Delete all videos by this creator and delete the creator
    const creatorVideos = videos.filter((v) => v.creatorId === creatorId);
    const videoPromises = creatorVideos.map((v) => deleteFirestoreDoc(doc(db, 'videos', v.id)));
    await Promise.all(videoPromises);
    const ref = doc(db, 'creators', creatorId);
    await deleteFirestoreDoc(ref);
  };

  const handleWipeDatabase = async () => {
    setVideos([]);
    setCreators([]);
    setActiveVideo(null);
    setIsMiniPlayer(false);
    try {
      localStorage.removeItem('ekiboozi_videos_cache');
      localStorage.removeItem('ekiboozi_creators_cache');
    } catch {
      // ignore
    }
    const videoPromises = videos.map((v) => deleteFirestoreDoc(doc(db, 'videos', v.id)));
    const creatorPromises = creators.map((c) => deleteFirestoreDoc(doc(db, 'creators', c.id)));
    await Promise.all([...videoPromises, ...creatorPromises]);
  };

  const isAdmin = user?.email === 'mubirushafik1088@gmail.com';

  const handleUpdateFooterSettings = async (settings: FooterSettings) => {
    try {
      await setDoc(doc(db, 'footer_settings', 'main'), settings, { merge: true });
    } catch (e) {
      console.error('Failed to update footer settings:', e);
      throw e;
    }
  };

  const handleUpdateTermsSettings = async (settings: TermsSettings) => {
    try {
      await setDoc(doc(db, 'terms_settings', 'main'), settings, { merge: true });
    } catch (e) {
      console.error('Failed to update terms settings:', e);
      throw e;
    }
  };

  // Display only real user videos (strictly zero mockup data)
  const allDisplayVideos = useMemo(() => {
    const seen = new Set<string>();
    return videos.filter((v) => {
      if (!v.id || seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  }, [videos]);

  // Nav View Selection
  const handleSelectView = (view: NavView) => {
    setCurrentView(view);
    setSelectedCreatorId(null);
    setSearchQuery('');
    if (view === 'trending') {
      setSelectedCategory('Trending');
    } else if (view === 'music') {
      setSelectedCategory('Music');
    } else if (view === 'comedy') {
      setSelectedCategory('Comedy');
    } else if (view === 'home') {
      setSelectedCategory('For you');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Overall search/category filter with real user data
  const filteredVideos = useMemo(() => {
    let result = [...allDisplayVideos];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.channel.toLowerCase().includes(q) ||
          (v.category || '').toLowerCase().includes(q)
      );
      return result;
    }

    if (selectedCreatorId) {
      result = result.filter((v) => v.creatorId === selectedCreatorId);
      return result;
    }

    if (selectedCategory && selectedCategory !== 'For you') {
      const target = selectedCategory.toLowerCase();
      if (target === 'trending') {
        return [...allDisplayVideos].sort(
          (a, b) => (b.likes || 0) + b.viewsCount - ((a.likes || 0) + a.viewsCount)
        );
      }
      if (target === 'following') {
        const followedCreatorIds = creators.filter((c) => c.isFollowed).map((c) => c.id);
        result = result.filter((v) => followedCreatorIds.includes(v.creatorId));
        return result;
      }

      result = result.filter((v) => {
        const cat = (v.category || '').toLowerCase();
        if (cat === target) return true;
        if (target === 'sports' && (cat.includes('football') || cat.includes('sport') || cat.includes('soccer'))) {
          return true;
        }
        if (target === 'football' && (cat.includes('football') || cat.includes('soccer'))) {
          return true;
        }
        if (target === 'music' && (cat.includes('music') || cat.includes('dance'))) {
          return true;
        }
        if (target === 'comedy' && (cat.includes('comedy') || cat.includes('skit'))) {
          return true;
        }
        return cat.includes(target);
      });
      return result;
    }

    return result;
  }, [allDisplayVideos, searchQuery, selectedCreatorId, selectedCategory, creators]);

  const followedCreators = creators.filter((c) => c.isFollowed);
  const likedVideosCount = videos.filter((v) => v.isLiked).length;

  // Each user can ONLY view their own uploads under their profile (strictly isolated)
  const currentUserUploadedVideos = useMemo(() => {
    if (!user) return [];
    return videos.filter((v) => {
      if (v.creatorId && v.creatorId === user.uid) return true;
      if (v.uploadedByUid && v.uploadedByUid === user.uid) return true;
      if (v.userEmail && user.email && v.userEmail.toLowerCase() === user.email.toLowerCase()) return true;
      return false;
    });
  }, [user, videos]);

  // Selected Creator for Profile View
  const profileCreator = useMemo(() => {
    if (!selectedCreatorId) return null;
    const found = creators.find((c) => c.id === selectedCreatorId);
    if (found) return found;
    const vid = videos.find((v) => v.creatorId === selectedCreatorId);
    if (vid) {
      return {
        id: selectedCreatorId,
        name: vid.channel,
        initials: vid.channelInitials || 'CR',
        avatarGradient: vid.channelAvatar || 'from-[#F2B705] to-[#E8890C]',
        avatarUrl: vid.channelAvatarUrl || user?.photoURL || undefined,
        subscribers: '1',
        isFollowed: false,
        bio: 'Content creator on Ekiboozi.',
        videosCount: videos.filter((v) => v.creatorId === selectedCreatorId).length,
        featuredTopic: vid.category || 'Creator',
      } as Creator;
    }
    return null;
  }, [selectedCreatorId, creators, videos, user]);

  // Active creator for player modal
  const activeCreator = useMemo(() => {
    if (!activeVideo) return undefined;
    return creators.find((c) => c.id === activeVideo.creatorId);
  }, [activeVideo, creators]);

  // Comments for active video
  const activeComments = useMemo(() => {
    if (!activeVideo) return [];
    return commentsMap[activeVideo.id] || [];
  }, [activeVideo, commentsMap]);

  // Combine custom hero items with recent video uploads (strictly deduplicated)
  const combinedHeroItems = useMemo(() => {
    const items = [...heroItems];
    const seenHeroIds = new Set(items.map((i) => i.id));
    const linkedVideoIds = new Set(items.map((i) => i.linkedVideoId).filter(Boolean));

    const recentVideosAsItems: HeroCarouselItem[] = [];
    for (const v of videos) {
      if (!v.id) continue;
      if (!linkedVideoIds.has(v.id)) {
        const heroId = `auto_${v.id}`;
        if (!seenHeroIds.has(heroId)) {
          seenHeroIds.add(heroId);
          recentVideosAsItems.push({
            id: heroId,
            title: v.title,
            subtitle: `New upload from ${v.channel}`,
            // Use lightweight thumbnail image for instantaneous hero spotlight loading
            mediaUrl: v.thumbnailUrl || '',
            mediaType: 'image' as const,
            posterUrl: v.thumbnailUrl || '',
            linkedVideoId: v.id,
          });
        }
      }
      if (recentVideosAsItems.length >= 3) break;
    }

    return [...items, ...recentVideosAsItems];
  }, [heroItems, videos]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#14171A] text-[#F3F1EA] flex flex-col selection:bg-[#F2B705] selection:text-[#14171A]">
      <h1 className="sr-only">Ekiboozi - Ugandan Video Storytelling Platform</h1>
      {/* Sticky Header */}
      <Header
        currentView={currentView}
        onSelectView={handleSelectView}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onOpenUpload={handleOpenUploadAction}
        onOpenProfile={() => setIsProfileOpen(true)}
        followingCount={followedCreators.length}
        user={user}
        onSignIn={async () => {
          try {
            await signInWithPopup(auth, googleProvider);
          } catch (error) {
            console.error('Error signing in:', error);
          }
        }}
      />

      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {currentView === 'admin' && isAdmin ? (
          <AdminDashboard 
            videos={videos}
            creators={creators}
            heroItems={heroItems}
            campaigns={campaigns}
            jobs={jobs}
            footerSettings={footerSettings}
            termsSettings={termsSettings}
            onDeleteVideo={handleDeleteVideo}
            onDeleteCreator={handleDeleteCreator}
            onWipeDatabase={handleWipeDatabase}
            onUpdateFooterSettings={handleUpdateFooterSettings}
            onUpdateTermsSettings={handleUpdateTermsSettings}
            onNavigateToTerms={() => handleSelectView('terms')}
          />
        ) : currentView === 'jobs' ? (
          <JobsView 
            jobs={jobs} 
            creators={creators}
            user={user} 
            onSelectJob={(job) => {
              setSelectedJob(job);
              setCurrentView('job_details');
            }}
          />
        ) : currentView === 'job_details' && selectedJob ? (
          <JobDetailsView 
            job={selectedJob}
            creator={creators.find(c => c.id === selectedJob.creatorId)}
            onBack={() => setCurrentView('jobs')}
            onApply={handleApplyJob}
            isApplying={isApplying}
          />
        ) : currentView === 'terms' ? (
          <TermsView
            termsSettings={termsSettings}
            onBack={() => handleSelectView('home')}
            isAdmin={isAdmin}
            onUpdateTerms={handleUpdateTermsSettings}
            onOpenAdminFooterTerms={() => handleSelectView('admin')}
          />
        ) : currentView === 'privacy' ? (
          <PrivacyPolicyView
            onBack={() => handleSelectView('home')}
          />
        ) : currentView === 'support' ? (
          <SupportView 
            campaigns={campaigns} 
            jobs={jobs}
            creators={creators}
            user={user} 
            onNavigateToJobs={() => setCurrentView('jobs')} 
            onSelectJob={(job) => {
              setSelectedJob(job);
              setCurrentView('job_details');
            }}
          />
        ) : currentView === 'creator_profile' && selectedCreatorId && profileCreator ? (
          <CreatorProfileView
            creator={profileCreator}
            videos={videos.filter(v => v.creatorId === selectedCreatorId)}
            onPlayVideo={handleStartPlaying}
            onToggleFollow={handleToggleFollow}
            currentUser={user}
            onBack={() => {
              setCurrentView('home');
              setSelectedCreatorId(null);
            }}
            onSelectCreator={handleViewCreatorProfile}
          />
        ) : (
          /* Home / Main View matching the HTML mockup */
          <div className="w-full max-w-full overflow-x-hidden">
            {/* Hero Section (only when not searching and category is 'For you') */}
            {!searchQuery && selectedCategory === 'For you' && !selectedCreatorId && (
              <HeroBanner
                heroItems={combinedHeroItems}
                isLoading={isLoading}
                onPlayHero={(videoId) => {
                  const video = videos.find(v => v.id === videoId);
                  if (video) setActiveVideo(video);
                }}
              />
            )}

            {/* Category Filter Rail */}
            <CategoryRail
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setSelectedCreatorId(null);
                setSearchQuery('');
              }}
            />

            {/* Empty State / Loading Skeleton */}
            {isLoading ? (
              <section className="px-4 sm:px-8 max-w-[1280px] mx-auto pt-8">
                {/* Creators Rail Skeleton */}
                <div className="flex gap-4 overflow-hidden mb-12">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
                      <div className="w-[72px] h-[72px] rounded-full bg-[#1D2126] border border-[#333A41] animate-pulse" />
                      <div className="w-12 h-3 bg-[#1D2126] rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
                {/* Video Grid Skeleton */}
                <div className="flex items-baseline justify-between mb-5.5">
                  <div className="w-48 h-6 bg-[#1D2126] rounded-md animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="aspect-[16/10] bg-[#1D2126] border border-[#333A41] rounded-[14px] animate-pulse" />
                  ))}
                </div>
              </section>
            ) : videos.length === 0 ? (
              <section className="px-4 sm:px-8 max-w-[1280px] mx-auto pt-10 pb-16 text-center">
                <div className="bg-[#1D2126] border border-[#333A41] rounded-[24px] p-8 sm:p-12 max-w-lg mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-[#F2B705]/10 text-[#F2B705] flex items-center justify-center mx-auto mb-4">
                    <Film className="w-7 h-7" />
                  </div>
                  <h3 className="display-font text-[20px] font-bold text-[#F3F1EA] mb-2">
                    No stories posted yet
                  </h3>
                  <p className="text-[#9BA1A8] text-[14px] leading-relaxed mb-6">
                    Be the first creator to share your story on Ekiboozi with viewers across Uganda.
                  </p>
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="px-6 py-2.5 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] font-bold text-[14px] rounded-full transition-colors cursor-pointer"
                  >
                    Upload a Story
                  </button>
                </div>
              </section>
            ) : (
              <>
                {/* Creators Horizontal Rail */}
                {!searchQuery && (
                  <CreatorsRail
                    creators={creators}
                    selectedCreatorId={selectedCreatorId}
                    onSelectCreator={handleViewCreatorProfile}
                    onToggleFollow={handleToggleFollow}
                  />
                )}

                {/* History Rail */}
                {!searchQuery && watchHistory.length > 0 && (
                  <section className="px-4 sm:px-8 max-w-[1280px] mx-auto mb-12">
                    <h2 className="display-font text-[22px] font-semibold text-[#F3F1EA] mb-6">Watch History</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-6">
                      {Array.from(
                        new Set(
                          [...watchHistory]
                            .sort((a, b) => getTimeMillis(b.watchedAt) - getTimeMillis(a.watchedAt))
                            .map((h) => h.videoId)
                        )
                      )
                        .map((id) => videos.find((v) => v.id === id))
                        .filter((v): v is Video => Boolean(v))
                        .slice(0, 4)
                        .map((video) => (
                          <VideoCard 
                            key={`hist-${video.id}`} 
                            video={video} 
                            onPlay={handleStartPlaying}
                          />
                        ))}
                    </div>
                  </section>
                )}

                {/* Search or Category Filtered Results */}
                {searchQuery || selectedCategory !== 'For you' || selectedCreatorId ? (
                  <section className="px-4 sm:px-8 max-w-[1280px] mx-auto py-8">
                    <div className="flex items-baseline justify-between mb-6">
                      <div>
                        <h2 className="display-font text-[22px] font-semibold tracking-[-0.01em] text-[#F3F1EA]">
                          {searchQuery
                            ? `Search results for "${searchQuery}"`
                            : selectedCreatorId
                            ? `Stories by ${profileCreator?.name || 'Creator'}`
                            : selectedCategory}
                        </h2>
                        <p className="text-[13px] text-[#9BA1A8] mt-1">
                          {filteredVideos.length} {filteredVideos.length === 1 ? 'story' : 'stories'} found
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedCategory('For you');
                          setSelectedCreatorId(null);
                          setSearchQuery('');
                        }}
                        className="text-[13px] text-[#F2B705] hover:underline cursor-pointer"
                      >
                        Clear filters
                      </button>
                    </div>

                    {isLoading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-6">
                        {[1,2,3,4].map(i => <VideoCardSkeleton key={i} />)}
                      </div>
                    ) : filteredVideos.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-6">
                        {filteredVideos.reduce((acc: React.ReactNode[], video, index) => {
                          acc.push(
                            <VideoCard
                              key={video.id}
                              video={video}
                              onPlay={handleStartPlaying}
                              onSelectCreator={handleViewCreatorProfile}
                            />
                          );
                          // Inject ad after every 7th video (so it appears as the 8th item)
                          if ((index + 1) % 7 === 0) {
                            acc.push(
                              <AdBanner 
                                key={`ad-feed-${index}`} 
                                className="w-full aspect-[9/16] sm:aspect-video rounded-[16px] min-h-[200px]"
                                format="fluid"
                              />
                            );
                          }
                          return acc;
                        }, [])}
                      </div>
                    ) : (
                      <div className="py-16 text-center text-[#9BA1A8]">
                        <p className="text-[16px] font-medium text-[#F3F1EA]">No stories found</p>
                        <p className="text-[13px] mt-1">Try a different search term or category.</p>
                      </div>
                    )}
                  </section>
                ) : (
                  /* Real User Stories Feed */
                  <div className="pb-12 space-y-10">
                    {/* Section 1: Latest Stories */}
                    <section className="px-4 sm:px-8 max-w-[1280px] mx-auto pt-6">
                      <div className="flex items-baseline justify-between mb-5.5">
                        <h2 className="display-font text-[22px] font-semibold tracking-[-0.01em] text-[#F3F1EA]">
                          Latest stories
                        </h2>
                        <span className="text-[13px] text-[#9BA1A8]">
                          {videos.length} {videos.length === 1 ? 'story' : 'stories'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-6">
                        {isLoading ? [1,2,3,4].map(i => <VideoCardSkeleton key={i} />) : videos.map((video) => (
                          <VideoCard
                            key={video.id}
                            video={video}
                            onPlay={handleStartPlaying}
                            onSelectCreator={handleViewCreatorProfile}
                          />
                        ))}
                      </div>
                    </section>

                    {/* Section 2: If there are top liked stories, highlight them */}
                    {videos.length > 4 && (
                      <section className="px-4 sm:px-8 max-w-[1280px] mx-auto pt-4">
                        <div className="flex items-baseline justify-between mb-5.5">
                          <h2 className="display-font text-[22px] font-semibold tracking-[-0.01em] text-[#F3F1EA]">
                            Popular on Ekiboozi
                          </h2>
                          <button
                            onClick={() => setSelectedCategory('Trending')}
                            className="text-[14px] text-[#9BA1A8] hover:text-[#F2B705] font-medium transition-colors cursor-pointer"
                          >
                            See all
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-6">
                          {[...videos]
                            .sort((a, b) => ((b.likes || 0) + b.viewsCount) - ((a.likes || 0) + a.viewsCount))
                            .slice(0, 4)
                            .map((video) => (
                              <VideoCard
                                key={`pop-${video.id}`}
                                video={video}
                                onPlay={handleStartPlaying}
                                onSelectCreator={handleViewCreatorProfile}
                              />
                            ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </>
            )}
            </div>
        )}
      </main>

      {/* Footer */}
      <Footer
        footerSettings={footerSettings}
        currentView={currentView}
        onSelectView={handleSelectView}
        isAdmin={isAdmin}
        onOpenAdminFooterTerms={() => handleSelectView('admin')}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentView={currentView}
        onSelectView={handleSelectView}
        onOpenUpload={handleOpenUploadAction}
        user={user}
        isAdmin={isAdmin}
      />

      {/* Floating Mini-Player */}
      {activeVideo && isMiniPlayer && (
        <MiniPlayer
          video={activeVideo}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          progress={playbackProgress}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
          onExpand={() => setIsMiniPlayer(false)}
          onClose={handleCloseVideo}
        />
      )}

      {/* Interactive Video Player Modal */}
      {activeVideo && !isMiniPlayer && (
        <VideoPlayerModal
          video={activeVideo}
          creator={activeCreator}
          comments={activeComments}
          onClose={handleCloseVideo}
          onMinimize={() => setIsMiniPlayer(true)}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          progress={playbackProgress}
          onProgressChange={(pct) => setPlaybackProgress(pct)}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
          onToggleLike={handleToggleLike}
          onToggleFollow={handleToggleFollow}
          onAddComment={handleAddComment}
          onSelectCreator={(creatorId) => {
            handleViewCreatorProfile(creatorId);
            setIsMiniPlayer(true);
          }}
          allVideos={allDisplayVideos}
          onPlayNext={(nextVideo) => {
            handleStartPlaying(nextVideo);
          }}
          user={user}
          onOpenMyUploads={() => setIsMyUploadsOpen(true)}
          onDeleteVideo={handleDeleteVideo}
        />
      )}

      {/* Creation Choice Sheet (Upload Video or Record Camera) */}
      <CreateActionModal
        isOpen={isCreateChoiceOpen}
        onClose={() => setIsCreateChoiceOpen(false)}
        onSelectUpload={() => setIsUploadOpen(true)}
        onSelectRecordCamera={() => setIsRecordCameraOpen(true)}
        user={user}
        onSignIn={async () => {
          try {
            await signInWithPopup(auth, googleProvider);
          } catch (error) {
            console.error('Error signing in:', error);
          }
        }}
      />

      {/* Device Camera Recording Studio */}
      <CameraRecordModal
        isOpen={isRecordCameraOpen}
        onClose={() => setIsRecordCameraOpen(false)}
        onRecordingComplete={(file) => {
          setRecordedCameraFile(file);
          setIsRecordCameraOpen(false);
          setIsUploadOpen(true);
        }}
      />

      {/* Upload Story Modal */}
      {isUploadOpen && (
        <UploadModal
          onClose={() => {
            setIsUploadOpen(false);
            setRecordedCameraFile(null);
          }}
          onUploadSuccess={handleUploadSuccess}
          user={user}
          initialVideoFile={recordedCameraFile}
          onOpenRecordCamera={() => {
            setIsUploadOpen(false);
            setIsRecordCameraOpen(true);
          }}
        />
      )}

      {/* User Profile Modal */}
      {isProfileOpen && (
        <UserProfileModal
          onClose={() => setIsProfileOpen(false)}
          followedCreators={followedCreators}
          userUploadedVideos={currentUserUploadedVideos}
          likedVideosCount={likedVideosCount}
          user={user}
          jobApplications={jobApplications}
          onOpenMyUploads={() => setIsMyUploadsOpen(true)}
          onSelectVideo={handleStartPlaying}
          onVideoUpdated={handleVideoUpdated}
          onVideoDeleted={handleDeleteVideo}
          onOpenUpload={() => setIsUploadOpen(true)}
          onSignOut={async () => {
            await auth.signOut();
            setIsProfileOpen(false);
          }}
        />
      )}

      {/* My Uploads & Content Management Studio Modal */}
      <MyUploadsModal
        isOpen={isMyUploadsOpen}
        onClose={() => setIsMyUploadsOpen(false)}
        user={user}
        videos={videos}
        jobs={jobs}
        campaigns={campaigns}
        onSelectVideo={handleStartPlaying}
        onVideoUpdated={handleVideoUpdated}
        onVideoDeleted={handleDeleteVideo}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Global Payment Result Notification */}
      {paymentNotice && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#1D2126] border border-[#333A41] rounded-[24px] shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setPaymentNotice(null)}
              className="absolute top-4 right-4 text-[#9BA1A8] hover:text-[#F3F1EA] transition-colors p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${
              paymentNotice.type === 'success' 
                ? 'bg-[#1DB954]/20 text-[#1DB954]' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {paymentNotice.type === 'success' ? (
                <CheckCircle2 className="w-10 h-10" />
              ) : (
                <AlertTriangle className="w-10 h-10" />
              )}
            </div>

            <h3 className="text-[20px] font-bold text-[#F3F1EA] mb-2">{paymentNotice.title}</h3>
            <p className="text-[#9BA1A8] text-[14px] leading-relaxed mb-6">
              {paymentNotice.message}
            </p>

            <button
              onClick={() => setPaymentNotice(null)}
              className="w-full py-3.5 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] text-[15px] font-bold rounded-xl transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Global Cookie Consent Banner */}
      <CookieBanner />

      {/* Connectivity Status Toast for PWA / Mobile */}
      <OfflineIndicator />
    </div>
  );
}
