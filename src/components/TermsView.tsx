import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Scale,
  Mail,
  Printer,
  Copy,
  Check,
  Edit2,
  Plus,
  Trash2,
  Save,
  X,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TermsSettings, TermsSection } from '../types';
import { DEFAULT_TERMS_SETTINGS } from '../constants/legalDefaults';

interface TermsViewProps {
  termsSettings?: TermsSettings;
  onBack: () => void;
  isAdmin?: boolean;
  onUpdateTerms?: (settings: TermsSettings) => Promise<void>;
  onOpenAdminFooterTerms?: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({
  termsSettings = DEFAULT_TERMS_SETTINGS,
  onBack,
  isAdmin,
  onUpdateTerms,
  onOpenAdminFooterTerms,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState(
    termsSettings.sections?.[0]?.id || 'acceptance'
  );

  // Admin In-Place Editing Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local draft state for editing
  const [draftTitle, setDraftTitle] = useState(termsSettings.title || DEFAULT_TERMS_SETTINGS.title);
  const [draftSubtitle, setDraftSubtitle] = useState(termsSettings.subtitle || DEFAULT_TERMS_SETTINGS.subtitle);
  const [draftVersion, setDraftVersion] = useState(termsSettings.version || DEFAULT_TERMS_SETTINGS.version);
  const [draftLastUpdated, setDraftLastUpdated] = useState(termsSettings.lastUpdated || DEFAULT_TERMS_SETTINGS.lastUpdated);
  const [draftSummary, setDraftSummary] = useState(termsSettings.executiveSummary || DEFAULT_TERMS_SETTINGS.executiveSummary);
  const [draftJurisdiction, setDraftJurisdiction] = useState(termsSettings.jurisdiction || DEFAULT_TERMS_SETTINGS.jurisdiction);
  const [draftLegalEmail, setDraftLegalEmail] = useState(termsSettings.legalEmail || DEFAULT_TERMS_SETTINGS.legalEmail);
  const [draftSupportEmail, setDraftSupportEmail] = useState(termsSettings.supportEmail || DEFAULT_TERMS_SETTINGS.supportEmail);
  const [draftSections, setDraftSections] = useState<TermsSection[]>(
    termsSettings.sections && termsSettings.sections.length > 0
      ? [...termsSettings.sections]
      : [...DEFAULT_TERMS_SETTINGS.sections]
  );

  // Section editor sub-modal
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [sectionTitleInput, setSectionTitleInput] = useState('');
  const [sectionIdInput, setSectionIdInput] = useState('');
  const [sectionContentInput, setSectionContentInput] = useState('');
  const [isNewSection, setIsNewSection] = useState(false);

  const sections: TermsSection[] =
    termsSettings.sections && termsSettings.sections.length > 0
      ? [...termsSettings.sections].sort((a, b) => a.order - b.order)
      : DEFAULT_TERMS_SETTINGS.sections;

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const openEditModal = () => {
    setDraftTitle(termsSettings.title || DEFAULT_TERMS_SETTINGS.title);
    setDraftSubtitle(termsSettings.subtitle || DEFAULT_TERMS_SETTINGS.subtitle);
    setDraftVersion(termsSettings.version || DEFAULT_TERMS_SETTINGS.version);
    setDraftLastUpdated(termsSettings.lastUpdated || DEFAULT_TERMS_SETTINGS.lastUpdated);
    setDraftSummary(termsSettings.executiveSummary || DEFAULT_TERMS_SETTINGS.executiveSummary);
    setDraftJurisdiction(termsSettings.jurisdiction || DEFAULT_TERMS_SETTINGS.jurisdiction);
    setDraftLegalEmail(termsSettings.legalEmail || DEFAULT_TERMS_SETTINGS.legalEmail);
    setDraftSupportEmail(termsSettings.supportEmail || DEFAULT_TERMS_SETTINGS.supportEmail);
    setDraftSections(
      termsSettings.sections && termsSettings.sections.length > 0
        ? [...termsSettings.sections]
        : [...DEFAULT_TERMS_SETTINGS.sections]
    );
    setEditingSectionIndex(null);
    setIsEditModalOpen(true);
  };

  const handleSaveTerms = async () => {
    if (!onUpdateTerms) return;
    setIsSaving(true);
    try {
      const updated: TermsSettings = {
        title: draftTitle.trim() || 'Terms and Conditions',
        subtitle: draftSubtitle.trim(),
        version: draftVersion.trim() || 'Version 2.4',
        lastUpdated: draftLastUpdated.trim() || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        executiveSummary: draftSummary.trim(),
        jurisdiction: draftJurisdiction.trim() || 'Republic of Uganda',
        legalEmail: draftLegalEmail.trim() || 'legal@ekiboozi.ug',
        supportEmail: draftSupportEmail.trim() || 'support@ekiboozi.ug',
        sections: draftSections.map((s, idx) => ({
          ...s,
          order: idx + 1,
        })),
        updatedAt: new Date().toISOString(),
      };
      await onUpdateTerms(updated);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditModalOpen(false);
      }, 1000);
    } catch (e) {
      console.error('Failed to save terms:', e);
      alert('Error saving Terms & Conditions. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartAddSection = () => {
    setIsNewSection(true);
    setEditingSectionIndex(draftSections.length);
    setSectionTitleInput(`${draftSections.length + 1}. New Policy Section`);
    setSectionIdInput(`section-${Date.now()}`);
    setSectionContentInput('');
  };

  const handleStartEditSection = (index: number) => {
    setIsNewSection(false);
    setEditingSectionIndex(index);
    const sec = draftSections[index];
    setSectionTitleInput(sec.title);
    setSectionIdInput(sec.id);
    setSectionContentInput(sec.content);
  };

  const handleSaveSectionItem = () => {
    if (!sectionTitleInput.trim()) {
      alert('Please enter a section title.');
      return;
    }
    const cleanId = (sectionIdInput.trim() || sectionTitleInput.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');

    const newSec: TermsSection = {
      id: cleanId || `section-${Date.now()}`,
      title: sectionTitleInput.trim(),
      content: sectionContentInput.trim(),
      order: editingSectionIndex !== null ? editingSectionIndex + 1 : draftSections.length + 1,
    };

    if (isNewSection) {
      setDraftSections([...draftSections, newSec]);
    } else if (editingSectionIndex !== null) {
      const updated = [...draftSections];
      updated[editingSectionIndex] = newSec;
      setDraftSections(updated);
    }

    setEditingSectionIndex(null);
  };

  const handleDeleteSection = (index: number) => {
    if (!window.confirm(`Delete section "${draftSections[index]?.title}"?`)) return;
    const updated = draftSections.filter((_, idx) => idx !== index);
    setDraftSections(updated);
    if (editingSectionIndex === index) {
      setEditingSectionIndex(null);
    }
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= draftSections.length) return;
    const updated = [...draftSections];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setDraftSections(updated);
  };

  const handleResetToDefaults = () => {
    if (!window.confirm('Reset draft Terms & Conditions to the default 11 sections?')) return;
    setDraftTitle(DEFAULT_TERMS_SETTINGS.title);
    setDraftSubtitle(DEFAULT_TERMS_SETTINGS.subtitle);
    setDraftVersion(DEFAULT_TERMS_SETTINGS.version);
    setDraftLastUpdated(DEFAULT_TERMS_SETTINGS.lastUpdated);
    setDraftSummary(DEFAULT_TERMS_SETTINGS.executiveSummary);
    setDraftJurisdiction(DEFAULT_TERMS_SETTINGS.jurisdiction);
    setDraftLegalEmail(DEFAULT_TERMS_SETTINGS.legalEmail);
    setDraftSupportEmail(DEFAULT_TERMS_SETTINGS.supportEmail);
    setDraftSections([...DEFAULT_TERMS_SETTINGS.sections]);
  };

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
      {/* Top Header & Breadcrumb */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[14px] text-[#9BA1A8] hover:text-[#F2B705] transition-colors mb-6 cursor-pointer group"
          id="terms-back-button"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to stories</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#333A41]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F2B705]/10 border border-[#F2B705]/20 text-[#F2B705] text-[12px] font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Agreement</span>
            </div>
            <h1 className="display-font text-[28px] sm:text-[36px] font-bold tracking-[-0.02em] text-[#F3F1EA]">
              {termsSettings.title || DEFAULT_TERMS_SETTINGS.title}
            </h1>
            <p className="text-[#9BA1A8] text-[14px] sm:text-[15px] mt-2 max-w-2xl leading-relaxed">
              {termsSettings.subtitle || DEFAULT_TERMS_SETTINGS.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <button
                onClick={openEditModal}
                className="flex items-center gap-2 px-4 py-2 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] text-[13px] font-bold rounded-[10px] transition-colors cursor-pointer shadow-sm"
                title="Edit Terms and Conditions"
                id="terms-admin-edit-btn"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Terms (Admin)</span>
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#1D2126] hover:bg-[#262C33] border border-[#333A41] text-[#F3F1EA] text-[13px] font-medium rounded-[10px] transition-colors cursor-pointer"
              title="Copy page link"
              id="terms-copy-btn"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-[#9BA1A8]" />}
              <span>{copied ? 'Link Copied' : 'Share'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#1D2126] hover:bg-[#262C33] border border-[#333A41] text-[#F3F1EA] text-[13px] font-medium rounded-[10px] transition-colors cursor-pointer"
              title="Print document"
              id="terms-print-btn"
            >
              <Printer className="w-4 h-4 text-[#9BA1A8]" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#656C73] mt-3">
          <span>Last Updated: {termsSettings.lastUpdated || DEFAULT_TERMS_SETTINGS.lastUpdated}</span>
          <span>•</span>
          <span>{termsSettings.version || DEFAULT_TERMS_SETTINGS.version}</span>
          <span>•</span>
          <span>Applicable to all Ekiboozi users & creators</span>
          {isAdmin && onOpenAdminFooterTerms && (
            <>
              <span>•</span>
              <button
                onClick={onOpenAdminFooterTerms}
                className="text-[#F2B705] hover:underline cursor-pointer font-medium"
              >
                Admin Dashboard Control
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Layout with Sticky Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">
        {/* Navigation Sidebar (Desktop) */}
        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
          <div className="sticky top-24 bg-[#1D2126] border border-[#333A41] rounded-[16px] p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#333A41]">
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#F3F1EA]">
                <FileText className="w-4 h-4 text-[#F2B705]" />
                <span>Table of Contents</span>
              </div>
              {isAdmin && (
                <button
                  onClick={openEditModal}
                  className="text-[11px] text-[#F2B705] hover:underline font-semibold flex items-center gap-1"
                  title="Add or edit sections"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Section</span>
                </button>
              )}
            </div>

            <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-[8px] text-[13px] transition-all cursor-pointer truncate ${
                    activeSection === section.id
                      ? 'bg-[#F2B705]/15 text-[#F2B705] font-semibold translate-x-1'
                      : 'text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262C33]'
                  }`}
                  title={section.title}
                >
                  {section.title}
                </button>
              ))}
            </nav>

            <div className="mt-6 pt-5 border-t border-[#333A41] text-[12px] text-[#656C73]">
              Need help understanding these terms?
              <a
                href={`mailto:${termsSettings.legalEmail || 'legal@ekiboozi.ug'}`}
                className="block text-[#F2B705] hover:underline font-medium mt-1"
              >
                Contact Ekiboozi Legal
              </a>
            </div>
          </div>
        </aside>

        {/* Legal Text Body */}
        <article className="lg:col-span-8 xl:col-span-9 space-y-10 text-[#9BA1A8] text-[14.5px] sm:text-[15px] leading-relaxed">
          {/* Summary Box */}
          <div className="bg-gradient-to-br from-[#1D2126] to-[#171A1E] border border-[#333A41] rounded-[16px] p-6 text-[14px]">
            <h2 className="text-[#F3F1EA] font-bold text-[16px] mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#F2B705]" />
              Executive Summary
            </h2>
            <p className="text-[#9BA1A8] leading-relaxed whitespace-pre-line">
              {termsSettings.executiveSummary || DEFAULT_TERMS_SETTINGS.executiveSummary}
            </p>
          </div>

          {/* Dynamic Sections */}
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="flex items-center justify-between gap-4 mb-3 pb-2 border-b border-[#333A41]/60">
                <h2 className="display-font text-[20px] font-bold text-[#F3F1EA]">
                  {section.title}
                </h2>
                {isAdmin && (
                  <button
                    onClick={() => {
                      const idx = draftSections.findIndex((s) => s.id === section.id);
                      openEditModal();
                      if (idx !== -1) {
                        handleStartEditSection(idx);
                      }
                    }}
                    className="text-[12px] text-[#9BA1A8] hover:text-[#F2B705] flex items-center gap-1 cursor-pointer transition-colors"
                    title="Quick edit this section"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 whitespace-pre-line text-[#9BA1A8]">
                {section.content.split('\n\n').map((paragraph, pIdx) => (
                  <p key={pIdx} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          {/* Jurisdiction Note */}
          <section id="governing-law-box" className="scroll-mt-24">
            <div className="flex items-start gap-3 bg-[#1D2126] border border-[#333A41] rounded-[14px] p-4">
              <Scale className="w-5 h-5 text-[#F2B705] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#F3F1EA] font-semibold text-[14px] mb-1">
                  Jurisdiction: {termsSettings.jurisdiction || DEFAULT_TERMS_SETTINGS.jurisdiction}
                </p>
                <p className="text-[13px] leading-relaxed">
                  These Terms and any dispute or claim arising out of or in connection with them shall be governed by and construed in accordance with the substantive laws of the{' '}
                  <strong className="text-[#F3F1EA]">{termsSettings.jurisdiction || DEFAULT_TERMS_SETTINGS.jurisdiction}</strong>. Any legal action or proceeding shall be brought exclusively in the competent courts located in Kampala, Uganda.
                </p>
              </div>
            </div>
          </section>

          {/* Direct Contacts Grid */}
          <section id="contact-info" className="scroll-mt-24">
            <h3 className="text-[#F3F1EA] font-bold text-[16px] mb-3">Legal & Safety Contacts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#1D2126] border border-[#333A41] rounded-[12px] p-4">
                <div className="text-[12px] text-[#656C73] uppercase tracking-wider font-semibold mb-1">
                  Legal & Compliance
                </div>
                <div className="text-[#F3F1EA] font-medium text-[14px] flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#F2B705]" />
                  <span>{termsSettings.legalEmail || DEFAULT_TERMS_SETTINGS.legalEmail}</span>
                </div>
                <div className="text-[12px] text-[#9BA1A8] mt-1">Kampala, Uganda</div>
              </div>
              <div className="bg-[#1D2126] border border-[#333A41] rounded-[12px] p-4">
                <div className="text-[12px] text-[#656C73] uppercase tracking-wider font-semibold mb-1">
                  General Inquiries & Safety
                </div>
                <div className="text-[#F3F1EA] font-medium text-[14px] flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#F2B705]" />
                  <span>{termsSettings.supportEmail || DEFAULT_TERMS_SETTINGS.supportEmail}</span>
                </div>
                <div className="text-[12px] text-[#9BA1A8] mt-1">24/7 Creator Care</div>
              </div>
            </div>
          </section>

          {/* Bottom Call to Action */}
          <div className="pt-6 border-t border-[#333A41] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-[#656C73]">
              By continuing to explore Ekiboozi, you confirm your acceptance of these Terms.
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isAdmin && (
                <button
                  onClick={openEditModal}
                  className="px-5 py-2.5 bg-[#1D2126] hover:bg-[#262C33] border border-[#F2B705]/40 text-[#F2B705] font-semibold text-[13.5px] rounded-full transition-colors cursor-pointer w-full sm:w-auto text-center"
                >
                  Edit Terms
                </button>
              )}
              <button
                onClick={onBack}
                className="px-6 py-2.5 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] font-bold text-[14px] rounded-full transition-colors cursor-pointer w-full sm:w-auto text-center"
                id="terms-agree-return-btn"
              >
                Back to Stories
              </button>
            </div>
          </div>
        </article>
      </div>

      {/* Admin Terms Edit Modal */}
      {isAdmin && isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#1D2126] border border-[#333A41] rounded-[20px] w-full max-w-4xl p-6 sm:p-8 max-h-[90vh] flex flex-col shadow-2xl my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#333A41]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-[#F2B705]/15 flex items-center justify-center text-[#F2B705]">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold text-[#F3F1EA]">Admin: Edit Terms & Conditions</h2>
                  <p className="text-[13px] text-[#9BA1A8]">Update legal documentation, versioning, and policy sections</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#9BA1A8] hover:text-[#F3F1EA] p-2 rounded-lg hover:bg-[#262C33] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with Scroll */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Section editing sub-panel (if active) */}
              {editingSectionIndex !== null ? (
                <div className="bg-[#171A1E] border border-[#F2B705]/40 rounded-[14px] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[#F2B705] font-semibold text-[15px]">
                      {isNewSection ? 'Add New Legal Section' : `Edit Section ${editingSectionIndex + 1}`}
                    </h3>
                    <button
                      onClick={() => setEditingSectionIndex(null)}
                      className="text-[#9BA1A8] hover:text-[#F3F1EA] text-[12px] flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>

                  <div>
                    <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={sectionTitleInput}
                      onChange={(e) => setSectionTitleInput(e.target.value)}
                      placeholder="e.g. 12. Privacy Policy & Data Rights"
                      className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">
                      Anchor / Slug ID
                    </label>
                    <input
                      type="text"
                      value={sectionIdInput}
                      onChange={(e) => setSectionIdInput(e.target.value)}
                      placeholder="e.g. privacy-policy"
                      className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                    />
                    <p className="text-[11px] text-[#656C73] mt-1">Used for sidebar navigation anchor links.</p>
                  </div>

                  <div>
                    <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">
                      Content / Terms Text
                    </label>
                    <textarea
                      rows={6}
                      value={sectionContentInput}
                      onChange={(e) => setSectionContentInput(e.target.value)}
                      placeholder="Enter legal clause, bullet points, or guidelines..."
                      className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none resize-y"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingSectionIndex(null)}
                      className="px-4 py-2 bg-[#262C33] text-[#F3F1EA] text-[13px] font-medium rounded-[8px] hover:bg-[#333A41]"
                    >
                      Back to Sections
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSectionItem}
                      className="px-4 py-2 bg-[#F2B705] text-[#14171A] text-[13px] font-bold rounded-[8px] hover:bg-[#F2B705]/90"
                    >
                      {isNewSection ? 'Add to Document' : 'Update Section'}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* General Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">Document Title</label>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">Document Subtitle</label>
                  <input
                    type="text"
                    value={draftSubtitle}
                    onChange={(e) => setDraftSubtitle(e.target.value)}
                    className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">Version Number</label>
                  <input
                    type="text"
                    value={draftVersion}
                    onChange={(e) => setDraftVersion(e.target.value)}
                    placeholder="e.g. Version 2.4"
                    className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">Last Updated Date</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={draftLastUpdated}
                      onChange={(e) => setDraftLastUpdated(e.target.value)}
                      className="flex-1 bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraftLastUpdated(
                          new Date().toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        )
                      }
                      className="px-3 py-2 bg-[#262C33] text-[12px] text-[#F3F1EA] rounded-[10px] hover:bg-[#333A41] whitespace-nowrap"
                    >
                      Set Today
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">Governing Jurisdiction</label>
                  <input
                    type="text"
                    value={draftJurisdiction}
                    onChange={(e) => setDraftJurisdiction(e.target.value)}
                    placeholder="e.g. Republic of Uganda"
                    className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">Legal Email</label>
                  <input
                    type="email"
                    value={draftLegalEmail}
                    onChange={(e) => setDraftLegalEmail(e.target.value)}
                    className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">Executive Summary</label>
                <textarea
                  rows={3}
                  value={draftSummary}
                  onChange={(e) => setDraftSummary(e.target.value)}
                  className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                />
              </div>

              {/* Sections List */}
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#333A41]">
                  <h3 className="text-[#F3F1EA] font-semibold text-[15px] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#F2B705]" />
                    <span>Terms & Conditions Sections ({draftSections.length})</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetToDefaults}
                      className="text-[12px] text-[#9BA1A8] hover:text-[#F3F1EA] flex items-center gap-1 px-2.5 py-1 rounded bg-[#262C33] hover:bg-[#333A41]"
                      title="Reset all sections to defaults"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Defaults</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStartAddSection}
                      className="text-[12px] bg-[#F2B705] text-[#14171A] font-bold px-3 py-1 rounded-full hover:bg-[#F2B705]/90 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Section</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {draftSections.map((section, idx) => (
                    <div
                      key={section.id || idx}
                      className="bg-[#14171A] border border-[#333A41] hover:border-[#656C73] rounded-[12px] p-3.5 flex items-start justify-between gap-3 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#262C33] text-[#F2B705]">
                            #{idx + 1}
                          </span>
                          <h4 className="text-[14px] font-semibold text-[#F3F1EA] truncate">
                            {section.title}
                          </h4>
                          <span className="text-[11px] text-[#656C73]">
                            ({section.id})
                          </span>
                        </div>
                        <p className="text-[12px] text-[#9BA1A8] line-clamp-2">
                          {section.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveSection(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262C33] rounded disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSection(idx, 'down')}
                          disabled={idx === draftSections.length - 1}
                          className="p-1.5 text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262C33] rounded disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditSection(idx)}
                          className="p-1.5 text-[#F2B705] hover:bg-[#F2B705]/10 rounded"
                          title="Edit section"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(idx)}
                          className="p-1.5 text-[#E14545] hover:bg-[#E14545]/10 rounded"
                          title="Delete section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-[#333A41] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[13px] text-[#9BA1A8]">
                {saveSuccess ? (
                  <span className="text-green-400 font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Terms & Conditions updated successfully!
                  </span>
                ) : (
                  <span>All changes will be saved to Firestore and visible to all users.</span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-[#9BA1A8] hover:text-[#F3F1EA] font-medium text-[13.5px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTerms}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] font-bold text-[14px] rounded-full transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#14171A] border-t-transparent rounded-full animate-spin" />
                      <span>Saving to Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Publish & Save Terms</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
