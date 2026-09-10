import React, { useState, useMemo } from 'react';
import { AdBanner } from './AdBanner';
import { Creator, Video } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { VideoCard } from './VideoCard';
import { ArrowLeft, Check, UserPlus, Share2, Users, PlaySquare, Calendar, Eye } from 'lucide-react';
import { formatPublishDate } from '../utils/dateUtils';

interface CreatorProfileViewProps {
  creator: Creator;
  videos: Video[];
  onPlayVideo: (video: Video) => void;
  onToggleFollow: (creatorId: string) => void;
  onBack: () => void;
  onSelectCreator: (creatorId: string) => void;
  currentUser: FirebaseUser | null;
}

export const CreatorProfileView: React.FC<CreatorProfileViewProps> = ({
  creator,
  videos,
  onPlayVideo,
  onToggleFollow,
  onBack,
  onSelectCreator,
  currentUser,
}) => {
  const isOwner = currentUser?.uid === creator.id;
  const [activeTab, setActiveTab] = useState<'stories' | 'about' | 'analytics'>('stories');
  const [copied, setCopied] = useState(false);

  const totalViews = useMemo(() => {
    return videos.reduce((acc, v) => acc + v.viewsCount, 0).toLocaleString();
  }, [videos]);

  return (
    <div className="w-full bg-[#14171A]">
      {/* Banner */}
      <div className={`w-full h-48 sm:h-64 bg-gradient-to-br ${creator.avatarGradient} relative overflow-hidden group`}>
         <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-30 mix-blend-overlay" />
         
         <button onClick={onBack} className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10 border border-white/10 cursor-pointer">
           <ArrowLeft className="w-5 h-5" />
         </button>
      </div>

      {/* Profile Header Container */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
        <div className="relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row gap-5 sm:gap-8 items-start sm:items-end mb-8">
          {/* Avatar */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[#14171A] overflow-hidden bg-[#14171A] flex-shrink-0 shadow-2xl relative z-10">
             <div className={`w-full h-full bg-gradient-to-br ${creator.avatarGradient} flex items-center justify-center text-[40px] sm:text-[48px] font-bold text-[#14171A] overflow-hidden shadow-inner`}>
               {creator.avatarUrl ? (
                 <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
               ) : (
                 creator.initials
               )}
             </div>
          </div>

          {/* Info & Actions */}
          <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2">
             <div>
               <h1 className="display-font text-3xl sm:text-[36px] font-bold text-[#F3F1EA] tracking-[-0.02em] leading-none mb-2.5">
                 {creator.name} {isOwner && <span className="text-xs bg-[#21A8A3] text-white px-2 py-1 rounded ml-2">Owner</span>}
               </h1>
               <div className="flex flex-wrap items-center gap-3 text-[14px] text-[#9BA1A8] font-medium mb-3">
                 <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-[#9BA1A8]" /> {creator.subscribers === '1' ? '1 subscriber' : `${creator.subscribers || '0'} subscribers`}</span>
                 <span>·</span>
                 <span className="flex items-center gap-1.5"><PlaySquare className="w-4 h-4 text-[#9BA1A8]" /> {creator.videosCount} stories</span>
               </div>
               {creator.bio && (
                 <p className="text-[14px] text-[#9BA1A8] line-clamp-2 max-w-2xl leading-relaxed mb-4 sm:mb-0">
                   {creator.bio}
                 </p>
               )}
             </div>
             
             <div className="flex items-center gap-3">
                {!isOwner && (
                  <button
                    onClick={() => onToggleFollow(creator.id)}
                    className={`px-6 py-2.5 rounded-full text-[14px] font-semibold transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
                      creator.isFollowed
                        ? 'bg-[#1D2126] text-[#F3F1EA] border border-[#333A41] hover:border-red-500/50 hover:text-red-400'
                        : 'bg-[#F2B705] text-[#14171A] hover:bg-[#F2B705]/90 border border-transparent'
                    }`}
                  >
                    {creator.isFollowed ? (
                      <><Check className="w-4 h-4 text-[#F2B705]" /> Subscribed</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Subscribe</>
                    )}
                  </button>
                )}
                {isOwner && (
                  <button className="px-6 py-2.5 rounded-full text-[14px] font-semibold bg-[#21A8A3] text-white">
                    Edit Profile
                  </button>
                )}

                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-10 h-10 rounded-full bg-[#1D2126] border border-[#333A41] hover:border-[#656C73] flex items-center justify-center text-[#F3F1EA] transition-colors relative cursor-pointer"
                  title="Share channel"
                >
                  <Share2 className="w-4 h-4" />
                  {copied && <span className="absolute -top-10 bg-[#21A8A3] text-[#0C1516] text-[11px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">Link Copied!</span>}
                </button>
             </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-6 border-b border-[#333A41] mb-8">
          <button 
            onClick={() => setActiveTab('stories')}
            className={`pb-3 text-[15px] font-medium transition-colors relative cursor-pointer ${activeTab === 'stories' ? 'text-[#F3F1EA]' : 'text-[#9BA1A8] hover:text-[#F3F1EA]'}`}
          >
            Stories
            {activeTab === 'stories' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F2B705] rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={`pb-3 text-[15px] font-medium transition-colors relative cursor-pointer ${activeTab === 'about' ? 'text-[#F3F1EA]' : 'text-[#9BA1A8] hover:text-[#F3F1EA]'}`}
          >
            About & Community
            {activeTab === 'about' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F2B705] rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 text-[15px] font-medium transition-colors relative cursor-pointer ${activeTab === 'analytics' ? 'text-[#F3F1EA]' : 'text-[#9BA1A8] hover:text-[#F3F1EA]'}`}
          >
            Analytics
            {activeTab === 'analytics' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F2B705] rounded-t-full" />}
          </button>
        </div>

        <AdBanner 
          className="w-full h-[90px] mb-8"
          format="horizontal"
        />

        {/* Tab Content */}
        {activeTab === 'stories' && (
          <div>
            <h2 className="display-font text-[20px] font-semibold text-[#F3F1EA] mb-6 tracking-[-0.01em]">
              Latest Uploads
            </h2>
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-6 pb-16">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onPlay={onPlayVideo}
                    onSelectCreator={onSelectCreator}
                  />
                ))}
              </div>
            ) : (
               <div className="py-16 flex flex-col items-center justify-center text-center text-[#9BA1A8] border border-[#333A41]/50 rounded-[20px] bg-[#1D2126]/30">
                 <PlaySquare className="w-12 h-12 mb-4 opacity-50 text-[#F2B705]" />
                 <p className="text-[16px] font-medium text-[#F3F1EA]">No stories yet</p>
                 <p className="text-[14px] mt-1 max-w-[280px]">This creator hasn't uploaded any videos to Ekiboozi recently.</p>
               </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="pb-16">
            <h2 className="display-font text-[20px] font-semibold text-[#F3F1EA] mb-6">Creator Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-[#1D2126] border border-[#333A41] rounded-[16px]">
                <p className="text-[#9BA1A8] text-[14px]">Total Views</p>
                <p className="text-[28px] font-bold text-[#F3F1EA] mt-1">{totalViews}</p>
              </div>
              <div className="p-6 bg-[#1D2126] border border-[#333A41] rounded-[16px]">
                <p className="text-[#9BA1A8] text-[14px]">Total Stories</p>
                <p className="text-[28px] font-bold text-[#F3F1EA] mt-1">{videos.length}</p>
              </div>
            </div>
            
            <h3 className="text-[18px] font-bold text-[#F3F1EA] mb-4">Video Performance</h3>
            <div className="bg-[#1D2126] border border-[#333A41] rounded-[16px] overflow-hidden">
               <table className="w-full text-left text-[14px]">
                 <thead className="bg-[#262B31] text-[#9BA1A8]">
                   <tr>
                     <th className="p-4">Title</th>
                     <th className="p-4">Views</th>
                     <th className="p-4">Likes</th>
                   </tr>
                 </thead>
                 <tbody className="text-[#F3F1EA]">
                   {videos.map(v => (
                     <tr key={v.id} className="border-t border-[#333A41]">
                       <td className="p-4">{v.title}</td>
                       <td className="p-4">{v.viewsCount.toLocaleString()}</td>
                       <td className="p-4">{v.likes.toLocaleString()}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-16">
             <div className="lg:col-span-2">
                <h2 className="display-font text-[20px] font-semibold text-[#F3F1EA] mb-4 tracking-[-0.01em]">
                  About {creator.name}
                </h2>
                <div className="p-6 bg-[#1D2126] border border-[#333A41] rounded-[16px] shadow-sm">
                  <p className="text-[15px] text-[#9BA1A8] leading-relaxed whitespace-pre-wrap">
                    {creator.bio || 'Authentic Ugandan storytelling and community culture.'}
                  </p>
                  
                  <div className="mt-8 pt-6 border-t border-[#333A41]/70 flex flex-wrap gap-4">
                    <div className="px-4 py-2 bg-[#14171A] rounded-[10px] border border-[#333A41]">
                       <div className="text-[11px] uppercase tracking-wider font-semibold text-[#656C73] mb-1">Main Focus</div>
                       <div className="text-[14px] font-medium text-[#F2B705]">{creator.featuredTopic}</div>
                    </div>
                  </div>
                </div>
             </div>

             <div>
                <h2 className="display-font text-[20px] font-semibold text-[#F3F1EA] mb-4 tracking-[-0.01em]">
                  Channel Stats
                </h2>
                <div className="flex flex-col gap-3">
                   <div className="flex items-center justify-between p-4 bg-[#1D2126] border border-[#333A41] rounded-[12px]">
                      <div className="flex items-center gap-3 text-[#9BA1A8]">
                         <Users className="w-5 h-5 text-[#21A8A3]" />
                         <span className="text-[14px] font-medium">Subscribers</span>
                      </div>
                      <div className="text-[15px] font-bold text-[#F3F1EA]">{creator.subscribers === '1' ? '1 subscriber' : `${creator.subscribers || '0'} subscribers`}</div>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-[#1D2126] border border-[#333A41] rounded-[12px]">
                      <div className="flex items-center gap-3 text-[#9BA1A8]">
                         <Eye className="w-5 h-5 text-[#E8890C]" />
                         <span className="text-[14px] font-medium">Total Views</span>
                      </div>
                      <div className="text-[15px] font-bold text-[#F3F1EA]">{totalViews}</div>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-[#1D2126] border border-[#333A41] rounded-[12px]">
                      <div className="flex items-center gap-3 text-[#9BA1A8]">
                         <Calendar className="w-5 h-5 text-[#8A4A9E]" />
                         <span className="text-[14px] font-medium">Joined</span>
                      </div>
                      <div className="text-[15px] font-bold text-[#F3F1EA]">{creator.createdAt ? formatPublishDate(creator.createdAt) : '2024'}</div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
