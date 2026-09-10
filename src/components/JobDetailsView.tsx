import React from 'react';
import { Job, Creator } from '../types';
import { ArrowLeft, Building, MapPin, DollarSign, Mail, User } from 'lucide-react';

interface JobDetailsViewProps {
  job: Job;
  creator: Creator | undefined;
  onBack: () => void;
  onApply: (jobId: string) => void;
  isApplying: boolean;
}

export const JobDetailsView: React.FC<JobDetailsViewProps> = ({ job, creator, onBack, onApply, isApplying }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[#9BA1A8] hover:text-[#F3F1EA] mb-8 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Jobs
      </button>

      <div className="bg-[#14171A] border border-[#333A41] rounded-[24px] p-6 md:p-10 shadow-xl">
        {job.posterUrl && (
          <img src={job.posterUrl} alt={job.title} className="w-full h-64 object-cover rounded-[16px] mb-8" />
        )}

        <h1 className="text-3xl md:text-4xl font-extrabold text-[#F3F1EA] mb-6 tracking-tight">{job.title}</h1>
        
        <div className="flex flex-wrap items-center gap-6 mb-8 text-[#9BA1A8]">
          <div className="flex items-center gap-2 bg-[#1A1D21] px-4 py-2 rounded-full border border-[#333A41]">
            <Building className="w-5 h-5 text-[#F2B705]" />
            <span className="font-semibold text-[#F3F1EA]">{job.company}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#9BA1A8]" />
            <span>{job.location}</span>
          </div>
          {job.salary && (
            <div className="flex items-center gap-2 text-[#1DB954]">
              <DollarSign className="w-5 h-5" />
              <span className="font-semibold">{job.salary}</span>
            </div>
          )}
        </div>

        <div className="border-t border-[#333A41] pt-8 mb-8">
          <h2 className="text-xl font-bold text-[#F3F1EA] mb-4">Job Description</h2>
          <p className="text-[#9BA1A8] leading-relaxed whitespace-pre-wrap">{job.description}</p>
        </div>

        <div className="bg-[#1A1D21] p-6 rounded-[20px] border border-[#333A41] mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-[#9BA1A8] text-sm mb-1">Posted by</h3>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${creator?.avatarGradient || 'bg-gradient-to-br from-gray-500 to-gray-700'}`}>
                {creator?.initials ? creator.initials : <User className="w-5 h-5" />}
              </div>
              <span className="font-bold text-[#F3F1EA]">{creator?.name || 'Community Member'}</span>
            </div>
          </div>
          <button 
            onClick={() => onApply(job.id)}
            disabled={isApplying}
            className="flex items-center gap-2 bg-[#F2B705] text-[#14171A] px-6 py-3 rounded-full font-bold hover:bg-[#F2B705]/90 transition-colors disabled:opacity-50"
          >
            {isApplying ? 'Applying...' : 'Apply Now'}
          </button>
        </div>
      </div>
    </div>
  );
};
