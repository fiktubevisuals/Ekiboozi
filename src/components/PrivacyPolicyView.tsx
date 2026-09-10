import React, { useEffect } from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

interface PrivacyPolicyViewProps {
  onBack: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-8 py-6 sm:py-10 text-[#F3F1EA] animate-in fade-in duration-300">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[#9BA1A8] hover:text-[#F3F1EA] transition-colors mb-8 group"
      >
        <div className="w-8 h-8 rounded-full bg-[#1A1D21] group-hover:bg-[#333A41] flex items-center justify-center transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="font-medium text-[14px]">Back to Home</span>
      </button>

      <div className="bg-[#1A1D21] border border-[#333A41] rounded-[20px] overflow-hidden">
        <div className="p-8 sm:p-12 border-b border-[#333A41] bg-gradient-to-b from-[#252A30] to-[#1A1D21]">
          <div className="w-16 h-16 rounded-2xl bg-[#3EA6FF]/10 flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-[#3EA6FF]" />
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-bold leading-tight mb-4">Privacy Policy</h1>
          <p className="text-[#9BA1A8] text-[16px]">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        <div className="p-8 sm:p-12 space-y-8 prose prose-invert max-w-none text-[15px] leading-relaxed text-[#D1D5DB]">
          <section>
            <h2 className="text-[20px] font-bold text-[#F3F1EA] mb-4">1. Introduction</h2>
            <p>
              Welcome to Ekiboozi. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy explains how we look after your personal data when you visit our website 
              (regardless of where you visit it from) and tells you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-[#F3F1EA] mb-4">2. Cookies and Web Beacons</h2>
            <p>
              Where necessary, Ekiboozi uses cookies to store information about a visitor's preferences and history in order to better serve the visitor and/or present the visitor with customized content.
            </p>
          </section>

          <section className="bg-[#252A30] p-6 rounded-xl border border-[#333A41]">
            <h2 className="text-[20px] font-bold text-[#F3F1EA] mb-4">3. Third-Party Advertising and Google AdSense</h2>
            <p className="mb-4">
              We use third-party advertising companies, including Google, to serve ads when you visit our website. 
              These companies may use cookies to serve ads based on your prior visits to our website or other websites.
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites.</li>
              <li>Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.</li>
              <li>Users may opt out of personalized advertising by visiting <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer" className="text-[#3EA6FF] hover:underline">Ads Settings</a>.</li>
            </ul>
            <p>
              Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting <a href="https://aboutads.info" target="_blank" rel="noopener noreferrer" className="text-[#3EA6FF] hover:underline">www.aboutads.info</a>.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-[#F3F1EA] mb-4">4. Log Files</h2>
            <p>
              Like many other Web sites, Ekiboozi makes use of log files. The information inside the log files includes 
              internet protocol (IP) addresses, type of browser, Internet Service Provider (ISP), date/time stamp, 
              referring/exit pages, and number of clicks to analyze trends, administer the site, track user's movement 
              around the site, and gather demographic information. IP addresses, and other such information are not linked 
              to any information that is personally identifiable.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-[#F3F1EA] mb-4">5. Contact Information</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at privacy@ekiboozi.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
