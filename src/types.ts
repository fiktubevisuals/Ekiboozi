export interface Video {
  id: string;
  title: string;
  channel: string;
  channelAvatar: string;
  channelAvatarUrl?: string;
  channelInitials: string;
  creatorId: string;
  views: string;
  viewsCount: number;
  timestamp: string;
  createdAt?: string;
  publishedAt?: string;
  duration: string;
  durationSeconds: number;
  thumbnailGradient: string;
  thumbnailUrl?: string;
  category: string;
  section: 'trending' | 'recommended' | 'music' | 'comedy' | 'custom' | 'hero';
  description?: string;
  isLive?: boolean;
  liveViewers?: string;
  likes: number;
  likedBy?: string[];
  isLiked?: boolean;
  commentsCount: number;
  videoUrl?: string;
  viewedBy?: string[];
}

export interface Creator {
  id: string;
  name: string;
  initials: string;
  avatarGradient: string;
  avatarUrl?: string;
  subscribers: string;
  subscribersCount?: number;
  subscribersList?: string[];
  isFollowed: boolean;
  bio?: string;
  videosCount: number;
  featuredTopic: string;
  createdAt?: string;
}

export interface Comment {
  id: string;
  author: string;
  authorInitials: string;
  avatarGradient: string;
  avatarUrl?: string;
  text: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean;
  createdAt?: string;
}

export interface HeroCarouselItem {
  id: string;
  title: string;
  subtitle: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  posterUrl?: string;
  linkedVideoId?: string;
  createdAt?: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  image: string;
  raised: number;
  target: number;
  organizer: string;
  status: 'pending' | 'approved';
  isFeatured: boolean;
  createdAt?: string;
  creatorId?: string;
  donorsCount?: number;
}

export interface Donation {
  id: string;
  campaignId: string;
  campaignTitle: string;
  amount: number;
  currency: string;
  donorName: string;
  donorEmail?: string;
  donorId?: string | null;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary: string;
  contactEmail: string;
  posterUrl?: string;
  kycDocUrl?: string;
  status: 'pending' | 'approved';
  creatorId: string;
  createdAt?: string;
}

export interface WatchHistory {
  id: string;
  userId: string;
  videoId: string;
  watchedAt: string;
  playbackTimestamp?: number;
}

export interface JobApplication {
  id?: string;
  userId: string;
  jobId: string;
  status: 'Submitted' | 'In Review' | 'Interviewing';
  appliedAt: string;
}

export type NavView = 'home' | 'trending' | 'music' | 'comedy' | 'support' | 'jobs' | 'job_details' | 'creator_profile' | 'admin' | 'terms' | 'privacy';

export interface FooterLink {
  id: string;
  label: string;
  type: 'internal' | 'external' | 'email';
  target: string; // NavView for internal, full URL for external, mailto for email
  order: number;
}

export interface FooterSettings {
  copyrightText: string;
  tagline?: string;
  links: FooterLink[];
  updatedAt?: string;
}

export interface TermsSection {
  id: string;
  title: string;
  content: string; // Plain text or markdown paragraphs
  order: number;
}

export interface TermsSettings {
  title: string;
  subtitle: string;
  version: string;
  lastUpdated: string;
  executiveSummary: string;
  jurisdiction: string;
  legalEmail: string;
  supportEmail: string;
  sections: TermsSection[];
  updatedAt?: string;
}
