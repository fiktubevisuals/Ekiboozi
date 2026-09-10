import { FooterSettings, TermsSettings } from '../types';

export const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  copyrightText: '© 2026 Ekiboozi Media Technologies. Built for Uganda and the world.',
  tagline: 'Uganda’s vibrant video storytelling platform.',
  links: [
    {
      id: 'link-about',
      label: 'About',
      type: 'internal',
      target: 'home',
      order: 1,
    },
    {
      id: 'link-creators',
      label: 'Creators',
      type: 'internal',
      target: 'home',
      order: 2,
    },
    {
      id: 'link-guidelines',
      label: 'Community guidelines',
      type: 'internal',
      target: 'terms',
      order: 3,
    },
    {
      id: 'link-terms',
      label: 'Terms & conditions',
      type: 'internal',
      target: 'terms',
      order: 4,
    },
    {
      id: 'link-privacy',
      label: 'Privacy Policy',
      type: 'internal',
      target: 'privacy',
      order: 5,
    },
    {
      id: 'link-help',
      label: 'Help',
      type: 'email',
      target: 'mailto:support@ekiboozi.ug',
      order: 6,
    },
  ],
};

export const DEFAULT_TERMS_SETTINGS: TermsSettings = {
  title: 'Terms and Conditions',
  subtitle: 'Please read these terms carefully before creating, watching, streaming, or conducting any activities on the Ekiboozi platform.',
  version: 'Version 2.4',
  lastUpdated: 'September 4, 2026',
  executiveSummary:
    'Ekiboozi is built to empower African and global storytellers, viewers, and creative communities. You retain full ownership of the videos and content you upload. By using Ekiboozi, you agree to treat fellow creators with respect, post only authentic content you hold rights to, adhere to community standards, and comply with the laws of Uganda.',
  jurisdiction: 'Republic of Uganda',
  legalEmail: 'legal@ekiboozi.ug',
  supportEmail: 'support@ekiboozi.ug',
  sections: [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      order: 1,
      content:
        'By accessing, browsing, registering for, or using the Ekiboozi website, mobile applications, creator portal, live video streaming, community campaigns, and job opportunities board (collectively, the "Service" or "Ekiboozi"), you acknowledge that you have read, understood, and agree to be legally bound by these Terms and Conditions ("Terms").\n\nIf you do not agree to these Terms, you must not access or use Ekiboozi. These Terms constitute a legally binding agreement between you ("User", "Creator", or "You") and Ekiboozi Media Technologies.',
    },
    {
      id: 'eligibility',
      title: '2. Eligibility & Accounts',
      order: 2,
      content:
        '2.1 Age Requirement: You must be at least 13 years old to use the Service. If you are between 13 and 18 years of age, you represent and warrant that you have obtained consent from a parent or legal guardian to agree to these Terms.\n\n2.2 Account Security: When signing in with Google Authentication or creating an Ekiboozi account, you are responsible for safeguarding your credentials. You must immediately notify Ekiboozi of any unauthorized use or security compromise of your account.\n\n2.3 Account Integrity: You agree not to impersonate any person, brand, creator, or entity, or create misleading accounts designed to deceive viewers or siphon community support.',
    },
    {
      id: 'creator-rights',
      title: '3. Content & Creator Rights',
      order: 3,
      content:
        '3.1 Ownership Remains With You: You retain full copyright and all intellectual property ownership rights in the videos, thumbnails, audio tracks, titles, and stories you upload to Ekiboozi. Ekiboozi does not claim ownership over your original content.\n\n3.2 License Granted to Ekiboozi: By uploading or submitting content to Ekiboozi, you grant Ekiboozi a worldwide, non-exclusive, royalty-free, transferable license (with the right to sub-license) to host, store, stream, transcode, display, reproduce, and distribute your content solely for the purposes of operating, improving, marketing, and delivering the Service to viewers across devices.\n\n3.3 License Duration: The license terminates when you delete your video or account from the Service, except where content has been cached, archived for legal compliance, or shared externally by third parties prior to deletion.',
    },
    {
      id: 'conduct',
      title: '4. Prohibited Conduct & Community Guidelines',
      order: 4,
      content:
        'Ekiboozi is committed to providing a secure, uplifting, and authentic storytelling environment. You agree that you will not upload, share, broadcast, or engage in:\n\n• Violence & Harm: Content that incites physical violence, terrorism, self-harm, or promotes dangerous illegal acts.\n• Hate Speech: Attacking individuals or groups based on race, ethnicity, religion, disability, gender, or tribal identity.\n• Sexual & Explicit Material: Pornographic media, non-consensual imagery, or sexually explicit depictions.\n• Harassment & Bullying: Targeted defamation, stalking, intimidation, or publishing private personal information (doxxing).\n• Deceptive Scams & Fraud: Misleading financial schemes, deceptive donation ploys, phishing, or predatory advertisements.\n• System Manipulation: Using automated bots, artificial view boosters, scrapers, or DDoS attacks against the infrastructure.\n\nViolating these conduct standards may result in immediate video removal, monetization strikes, or permanent account termination without prior notice.',
    },
    {
      id: 'campaigns',
      title: '5. Support Campaigns & Crowdfunding',
      order: 5,
      content:
        '5.1 Community Support: Ekiboozi allows verified creators and community leaders to launch approved fundraising campaigns (e.g., medical support, cultural preservation, creative production).\n\n5.2 Campaign Integrity & Truthfulness: Organizers must provide accurate, verifiable descriptions and use raised funds strictly for the stated purpose. Any falsification or diversion of funds is considered criminal fraud and will be reported to appropriate law enforcement authorities in Uganda.\n\n5.3 Voluntary Contributions: Contributions to campaigns are made voluntarily by users. Ekiboozi acts solely as a technological facilitator and does not guarantee campaign outcomes or tax deductibility.',
    },
    {
      id: 'jobs',
      title: '6. Job Board & Mandatory KYC Verification',
      order: 6,
      content:
        '6.1 Mandatory Verification (KYC): To prevent recruitment scams and protect job seekers, all employers posting openings on the Ekiboozi Opportunities Board must upload verifiable Know Your Customer (KYC) documentation (e.g. National ID, Certificate of Incorporation, or Business Registration).\n\n6.2 No Fees for Job Seekers: Employers are strictly prohibited from demanding application fees, interview charges, training deposits, or monetary payments from job seekers. Listings demanding payments will be deleted immediately and the poster permanently banned.\n\n6.3 Independent Employment: Ekiboozi is not an employer or employment agency. We do not endorse or guarantee the terms, safety, or accuracy of third-party employment listings.',
    },
    {
      id: 'copyright',
      title: '7. Copyright & Intellectual Property Protection',
      order: 7,
      content:
        'Ekiboozi respects the intellectual property of artists, filmmakers, musicians, and broadcasters. We comply with international copyright standards and the Copyright and Neighbouring Rights Act of Uganda.\n\nTakedown Policy: If you believe that your copyrighted work has been copied or posted on Ekiboozi in a way that constitutes copyright infringement, please submit a formal notice to our designated agent at copyright@ekiboozi.ug containing:\n• Identification of the copyrighted work claimed to have been infringed.\n• The URL or exact identifier of the infringing video or material on Ekiboozi.\n• Your legal contact information (name, address, telephone number, and email).\n• A statement of good faith belief that the use is not authorized by the copyright owner.\n• A statement made under penalty of perjury that the information is accurate and you are authorized to act on behalf of the owner.',
    },
    {
      id: 'termination',
      title: '8. Account Suspension & Termination',
      order: 8,
      content:
        'We reserve the right, at our sole discretion, to suspend or terminate your account, remove your uploaded stories or listings, and block your access to Ekiboozi if you violate these Terms, breach our community standards, engage in copyright infringement, or harm other users or the platform.\n\nYou may discontinue your use of Ekiboozi and delete your account at any time via your Profile Settings.',
    },
    {
      id: 'liability',
      title: '9. Disclaimers & Limitation of Liability',
      order: 9,
      content:
        '9.1 Provided "As Is": The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement.\n\n9.2 Third-Party Content: Ekiboozi does not endorse, verify, or assume responsibility for content, opinions, statements, or commercial offerings posted by users, creators, or external links.\n\n9.3 Limitation of Liability: To the maximum extent permitted by applicable law, Ekiboozi and its directors, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your access to or inability to use the Service.',
    },
    {
      id: 'governing-law',
      title: '10. Governing Law & Dispute Resolution',
      order: 10,
      content:
        'Jurisdiction: Republic of Uganda\n\nThese Terms and any dispute or claim arising out of or in connection with them shall be governed by and construed in accordance with the substantive laws of the Republic of Uganda. Any legal action or proceeding shall be brought exclusively in the competent courts located in Kampala, Uganda.',
    },
    {
      id: 'contact',
      title: '11. Contact & Legal Notices',
      order: 11,
      content:
        'If you have any questions, legal notices, copyright claims, or inquiries regarding these Terms and Conditions, please contact our legal and support team:\n\n• Legal & Compliance: legal@ekiboozi.ug (Kampala, Uganda)\n• General Inquiries & Safety: support@ekiboozi.ug (24/7 Creator Care)',
    },
  ],
};
