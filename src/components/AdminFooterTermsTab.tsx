import React, { useState } from 'react';
import {
  FooterSettings,
  FooterLink,
  TermsSettings,
  TermsSection,
  NavView,
} from '../types';
import {
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_TERMS_SETTINGS,
} from '../constants/legalDefaults';
import {
  Settings,
  Link as LinkIcon,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Mail,
  Save,
  Eye,
  X,
  Layers,
} from 'lucide-react';

interface AdminFooterTermsTabProps {
  footerSettings?: FooterSettings;
  termsSettings?: TermsSettings;
  onUpdateFooterSettings?: (settings: FooterSettings) => Promise<void>;
  onUpdateTermsSettings?: (settings: TermsSettings) => Promise<void>;
  onNavigateToTerms?: () => void;
}

export const AdminFooterTermsTab: React.FC<AdminFooterTermsTabProps> = ({
  footerSettings = DEFAULT_FOOTER_SETTINGS,
  termsSettings = DEFAULT_TERMS_SETTINGS,
  onUpdateFooterSettings,
  onUpdateTermsSettings,
  onNavigateToTerms,
}) => {
  const [subTab, setSubTab] = useState<'footer' | 'terms'>('footer');

  // --- FOOTER STATE ---
  const [footerCopyright, setFooterCopyright] = useState(
    footerSettings.copyrightText || DEFAULT_FOOTER_SETTINGS.copyrightText
  );
  const [footerTagline, setFooterTagline] = useState(
    footerSettings.tagline || DEFAULT_FOOTER_SETTINGS.tagline || ''
  );
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>(
    footerSettings.links && footerSettings.links.length > 0
      ? [...footerSettings.links]
      : [...DEFAULT_FOOTER_SETTINGS.links]
  );
  const [isSavingFooter, setIsSavingFooter] = useState(false);
  const [footerSavedMsg, setFooterSavedMsg] = useState(false);

  // Link Edit/Add Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [linkFormLabel, setLinkFormLabel] = useState('');
  const [linkFormType, setLinkFormType] = useState<'internal' | 'external' | 'email'>('internal');
  const [linkFormTarget, setLinkFormTarget] = useState('');
  const [linkFormOrder, setLinkFormOrder] = useState(1);

  // --- TERMS STATE ---
  const [termsTitle, setTermsTitle] = useState(
    termsSettings.title || DEFAULT_TERMS_SETTINGS.title
  );
  const [termsSubtitle, setTermsSubtitle] = useState(
    termsSettings.subtitle || DEFAULT_TERMS_SETTINGS.subtitle
  );
  const [termsVersion, setTermsVersion] = useState(
    termsSettings.version || DEFAULT_TERMS_SETTINGS.version
  );
  const [termsLastUpdated, setTermsLastUpdated] = useState(
    termsSettings.lastUpdated || DEFAULT_TERMS_SETTINGS.lastUpdated
  );
  const [termsExecutiveSummary, setTermsExecutiveSummary] = useState(
    termsSettings.executiveSummary || DEFAULT_TERMS_SETTINGS.executiveSummary
  );
  const [termsJurisdiction, setTermsJurisdiction] = useState(
    termsSettings.jurisdiction || DEFAULT_TERMS_SETTINGS.jurisdiction
  );
  const [termsLegalEmail, setTermsLegalEmail] = useState(
    termsSettings.legalEmail || DEFAULT_TERMS_SETTINGS.legalEmail
  );
  const [termsSupportEmail, setTermsSupportEmail] = useState(
    termsSettings.supportEmail || DEFAULT_TERMS_SETTINGS.supportEmail
  );
  const [termsSections, setTermsSections] = useState<TermsSection[]>(
    termsSettings.sections && termsSettings.sections.length > 0
      ? [...termsSettings.sections]
      : [...DEFAULT_TERMS_SETTINGS.sections]
  );
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [termsSavedMsg, setTermsSavedMsg] = useState(false);

  // Terms Section Modal State
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [sectionFormTitle, setSectionFormTitle] = useState('');
  const [sectionFormId, setSectionFormId] = useState('');
  const [sectionFormContent, setSectionFormContent] = useState('');

  // ----------------------------------------------------
  // FOOTER ACTIONS
  // ----------------------------------------------------
  const handleSaveFooter = async (updatedLinks = footerLinks) => {
    if (!onUpdateFooterSettings) return;
    setIsSavingFooter(true);
    try {
      const payload: FooterSettings = {
        copyrightText: footerCopyright.trim() || DEFAULT_FOOTER_SETTINGS.copyrightText,
        tagline: footerTagline.trim(),
        links: updatedLinks.map((l, i) => ({ ...l, order: i + 1 })),
        updatedAt: new Date().toISOString(),
      };
      await onUpdateFooterSettings(payload);
      setFooterSavedMsg(true);
      setTimeout(() => setFooterSavedMsg(false), 2500);
    } catch (err) {
      console.error('Failed to save footer settings:', err);
      alert('Error saving footer settings.');
    } finally {
      setIsSavingFooter(false);
    }
  };

  const handleOpenAddLink = () => {
    setEditingLinkIndex(null);
    setLinkFormLabel('');
    setLinkFormType('internal');
    setLinkFormTarget('terms');
    setLinkFormOrder(footerLinks.length + 1);
    setIsLinkModalOpen(true);
  };

  const handleOpenEditLink = (index: number) => {
    const link = footerLinks[index];
    setEditingLinkIndex(index);
    setLinkFormLabel(link.label);
    setLinkFormType(link.type);
    setLinkFormTarget(link.target);
    setLinkFormOrder(link.order || index + 1);
    setIsLinkModalOpen(true);
  };

  const handleSaveLinkItem = async () => {
    if (!linkFormLabel.trim()) {
      alert('Please enter a link label.');
      return;
    }
    if (!linkFormTarget.trim()) {
      alert('Please enter a target view, URL, or email address.');
      return;
    }

    const newLink: FooterLink = {
      id: editingLinkIndex !== null ? footerLinks[editingLinkIndex].id : `link-${Date.now()}`,
      label: linkFormLabel.trim(),
      type: linkFormType,
      target: linkFormTarget.trim(),
      order: linkFormOrder,
    };

    let updated: FooterLink[];
    if (editingLinkIndex !== null) {
      updated = [...footerLinks];
      updated[editingLinkIndex] = newLink;
    } else {
      updated = [...footerLinks, newLink];
    }
    updated.sort((a, b) => a.order - b.order);
    setFooterLinks(updated);
    setIsLinkModalOpen(false);

    // Auto-save changes
    await handleSaveFooter(updated);
  };

  const handleDeleteLink = async (index: number) => {
    const link = footerLinks[index];
    if (!window.confirm(`Are you sure you want to delete the footer link "${link.label}"?`)) return;
    const updated = footerLinks.filter((_, i) => i !== index);
    setFooterLinks(updated);
    await handleSaveFooter(updated);
  };

  const handleMoveLink = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= footerLinks.length) return;
    const updated = [...footerLinks];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    // update order properties
    const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
    setFooterLinks(reordered);
    await handleSaveFooter(reordered);
  };

  const handleResetFooterDefaults = async () => {
    if (!window.confirm('Reset all footer links and texts to default values?')) return;
    setFooterCopyright(DEFAULT_FOOTER_SETTINGS.copyrightText);
    setFooterTagline(DEFAULT_FOOTER_SETTINGS.tagline || '');
    setFooterLinks([...DEFAULT_FOOTER_SETTINGS.links]);
    if (onUpdateFooterSettings) {
      await onUpdateFooterSettings({
        ...DEFAULT_FOOTER_SETTINGS,
        updatedAt: new Date().toISOString(),
      });
      setFooterSavedMsg(true);
      setTimeout(() => setFooterSavedMsg(false), 2500);
    }
  };

  // ----------------------------------------------------
  // TERMS ACTIONS
  // ----------------------------------------------------
  const handleSaveTerms = async (updatedSections = termsSections) => {
    if (!onUpdateTermsSettings) return;
    setIsSavingTerms(true);
    try {
      const payload: TermsSettings = {
        title: termsTitle.trim() || DEFAULT_TERMS_SETTINGS.title,
        subtitle: termsSubtitle.trim(),
        version: termsVersion.trim() || DEFAULT_TERMS_SETTINGS.version,
        lastUpdated:
          termsLastUpdated.trim() ||
          new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        executiveSummary: termsExecutiveSummary.trim(),
        jurisdiction: termsJurisdiction.trim() || DEFAULT_TERMS_SETTINGS.jurisdiction,
        legalEmail: termsLegalEmail.trim() || DEFAULT_TERMS_SETTINGS.legalEmail,
        supportEmail: termsSupportEmail.trim() || DEFAULT_TERMS_SETTINGS.supportEmail,
        sections: updatedSections.map((s, idx) => ({ ...s, order: idx + 1 })),
        updatedAt: new Date().toISOString(),
      };
      await onUpdateTermsSettings(payload);
      setTermsSavedMsg(true);
      setTimeout(() => setTermsSavedMsg(false), 2500);
    } catch (err) {
      console.error('Failed to save terms settings:', err);
      alert('Error saving Terms and Conditions.');
    } finally {
      setIsSavingTerms(false);
    }
  };

  const handleOpenAddSection = () => {
    setEditingSectionIndex(null);
    setSectionFormTitle(`${termsSections.length + 1}. New Policy Section`);
    setSectionFormId(`sec-${Date.now()}`);
    setSectionFormContent('');
    setIsSectionModalOpen(true);
  };

  const handleOpenEditSection = (index: number) => {
    const sec = termsSections[index];
    setEditingSectionIndex(index);
    setSectionFormTitle(sec.title);
    setSectionFormId(sec.id);
    setSectionFormContent(sec.content);
    setIsSectionModalOpen(true);
  };

  const handleSaveSectionItem = async () => {
    if (!sectionFormTitle.trim()) {
      alert('Please enter a section title.');
      return;
    }
    const cleanId = (
      sectionFormId.trim() || sectionFormTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    ).replace(/^-|-$/g, '');

    const newSec: TermsSection = {
      id: cleanId || `sec-${Date.now()}`,
      title: sectionFormTitle.trim(),
      content: sectionFormContent.trim(),
      order: editingSectionIndex !== null ? editingSectionIndex + 1 : termsSections.length + 1,
    };

    let updated: TermsSection[];
    if (editingSectionIndex !== null) {
      updated = [...termsSections];
      updated[editingSectionIndex] = newSec;
    } else {
      updated = [...termsSections, newSec];
    }
    setTermsSections(updated);
    setIsSectionModalOpen(false);

    // Auto-save changes
    await handleSaveTerms(updated);
  };

  const handleDeleteSection = async (index: number) => {
    const sec = termsSections[index];
    if (!window.confirm(`Are you sure you want to delete the section "${sec.title}"?`)) return;
    const updated = termsSections.filter((_, i) => i !== index);
    setTermsSections(updated);
    await handleSaveTerms(updated);
  };

  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= termsSections.length) return;
    const updated = [...termsSections];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    const reordered = updated.map((s, idx) => ({ ...s, order: idx + 1 }));
    setTermsSections(reordered);
    await handleSaveTerms(reordered);
  };

  const handleResetTermsDefaults = async () => {
    if (!window.confirm('Reset all Terms & Conditions metadata and 11 sections to defaults?')) return;
    setTermsTitle(DEFAULT_TERMS_SETTINGS.title);
    setTermsSubtitle(DEFAULT_TERMS_SETTINGS.subtitle);
    setTermsVersion(DEFAULT_TERMS_SETTINGS.version);
    setTermsLastUpdated(DEFAULT_TERMS_SETTINGS.lastUpdated);
    setTermsExecutiveSummary(DEFAULT_TERMS_SETTINGS.executiveSummary);
    setTermsJurisdiction(DEFAULT_TERMS_SETTINGS.jurisdiction);
    setTermsLegalEmail(DEFAULT_TERMS_SETTINGS.legalEmail);
    setTermsSupportEmail(DEFAULT_TERMS_SETTINGS.supportEmail);
    setTermsSections([...DEFAULT_TERMS_SETTINGS.sections]);

    if (onUpdateTermsSettings) {
      await onUpdateTermsSettings({
        ...DEFAULT_TERMS_SETTINGS,
        updatedAt: new Date().toISOString(),
      });
      setTermsSavedMsg(true);
      setTimeout(() => setTermsSavedMsg(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Header & Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#333A41]">
        <div>
          <h2 className="text-[20px] font-bold text-[#F3F1EA] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#F2B705]" />
            <span>Footer & Legal Terms Management</span>
          </h2>
          <p className="text-[13px] text-[#9BA1A8] mt-0.5">
            Add, edit, reorder, or delete footer navigation links, copyright info, and legal Terms & Conditions.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-[#14171A] p-1 rounded-xl border border-[#333A41]">
          <button
            onClick={() => setSubTab('footer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
              subTab === 'footer'
                ? 'bg-[#F2B705] text-[#14171A] shadow-sm'
                : 'text-[#9BA1A8] hover:text-[#F3F1EA]'
            }`}
            id="admin-subtab-footer"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Footer Links & Info</span>
          </button>
          <button
            onClick={() => setSubTab('terms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
              subTab === 'terms'
                ? 'bg-[#F2B705] text-[#14171A] shadow-sm'
                : 'text-[#9BA1A8] hover:text-[#F3F1EA]'
            }`}
            id="admin-subtab-terms"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms & Conditions</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FOOTER MANAGEMENT SUB-TAB */}
      {/* ======================================================== */}
      {subTab === 'footer' && (
        <div className="space-y-8">
          {/* General Footer Configuration */}
          <div className="bg-[#14171A] border border-[#333A41] rounded-[16px] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#F3F1EA] flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#F2B705]" />
                <span>Footer General Settings</span>
              </h3>
              {footerSavedMsg && (
                <span className="text-[12px] text-green-400 font-semibold flex items-center gap-1 animate-pulse">
                  <Check className="w-3.5 h-3.5" /> Saved to cloud
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">
                  Copyright Notice
                </label>
                <input
                  type="text"
                  value={footerCopyright}
                  onChange={(e) => setFooterCopyright(e.target.value)}
                  placeholder="e.g. © 2026 Ekiboozi Media Technologies."
                  className="w-full bg-[#1D2126] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[13.5px] focus:border-[#F2B705] outline-none"
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">
                  Tagline / Subtext
                </label>
                <input
                  type="text"
                  value={footerTagline}
                  onChange={(e) => setFooterTagline(e.target.value)}
                  placeholder="e.g. Built for Uganda and the world."
                  className="w-full bg-[#1D2126] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[13.5px] focus:border-[#F2B705] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetFooterDefaults}
                className="px-4 py-2 text-[12px] text-[#9BA1A8] hover:text-[#F3F1EA] flex items-center gap-1.5 rounded-[8px] bg-[#1D2126] hover:bg-[#262C33] border border-[#333A41]"
                title="Reset footer to standard 5 default links"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Default Footer</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveFooter()}
                disabled={isSavingFooter}
                className="px-5 py-2 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] font-bold text-[13px] rounded-[8px] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingFooter ? 'Saving...' : 'Save Footer Settings'}</span>
              </button>
            </div>
          </div>

          {/* Footer Links List */}
          <div className="bg-[#14171A] border border-[#333A41] rounded-[16px] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#333A41]">
              <div>
                <h3 className="text-[15px] font-bold text-[#F3F1EA] flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-[#F2B705]" />
                  <span>Footer Links ({footerLinks.length})</span>
                </h3>
                <p className="text-[12px] text-[#9BA1A8]">
                  Manage the navigation links displayed across the bottom of every page.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddLink}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] font-bold text-[13px] rounded-full transition-all cursor-pointer shadow-sm"
                id="admin-add-footer-link-btn"
              >
                <Plus className="w-4 h-4" />
                <span>Add Footer Link</span>
              </button>
            </div>

            {/* Links Table / Card Grid */}
            <div className="space-y-2.5">
              {footerLinks.map((link, idx) => (
                <div
                  key={link.id || idx}
                  className="bg-[#1D2126] border border-[#333A41] hover:border-[#656C73] rounded-[12px] p-3.5 flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#14171A] text-[#F2B705] border border-[#333A41]">
                      #{idx + 1}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-[#F3F1EA] truncate">
                          {link.label}
                        </span>

                        {link.type === 'internal' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/20">
                            View: {link.target}
                          </span>
                        )}
                        {link.type === 'external' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-semibold border border-purple-500/20 flex items-center gap-1">
                            <ExternalLink className="w-2.5 h-2.5" /> External
                          </span>
                        )}
                        {link.type === 'email' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-semibold border border-green-500/20 flex items-center gap-1">
                            <Mail className="w-2.5 h-2.5" /> Contact
                          </span>
                        )}
                      </div>

                      <div className="text-[12px] text-[#656C73] truncate mt-0.5">
                        Target: <span className="text-[#9BA1A8]">{link.target}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveLink(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262C33] rounded disabled:opacity-25 cursor-pointer"
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveLink(idx, 'down')}
                      disabled={idx === footerLinks.length - 1}
                      className="p-1.5 text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262C33] rounded disabled:opacity-25 cursor-pointer"
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditLink(idx)}
                      className="p-1.5 text-[#F2B705] hover:bg-[#F2B705]/10 rounded cursor-pointer"
                      title="Edit link"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLink(idx)}
                      className="p-1.5 text-[#E14545] hover:bg-[#E14545]/10 rounded cursor-pointer"
                      title="Delete link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TERMS & CONDITIONS SUB-TAB */}
      {/* ======================================================== */}
      {subTab === 'terms' && (
        <div className="space-y-8">
          {/* Terms Overview & Metadata */}
          <div className="bg-[#14171A] border border-[#333A41] rounded-[16px] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-[15px] font-bold text-[#F3F1EA] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#F2B705]" />
                <span>Terms Document Overview</span>
              </h3>
              <div className="flex items-center gap-2">
                {onNavigateToTerms && (
                  <button
                    type="button"
                    onClick={onNavigateToTerms}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#262C33] hover:bg-[#333A41] text-[#F3F1EA] text-[12px] font-medium transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#F2B705]" />
                    <span>Preview Public Page</span>
                  </button>
                )}
                {termsSavedMsg && (
                  <span className="text-[12px] text-green-400 font-semibold flex items-center gap-1 animate-pulse">
                    <Check className="w-3.5 h-3.5" /> Saved to cloud
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] text-[#9BA1A8] font-medium mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={termsTitle}
                  onChange={(e) => setTermsTitle(e.target.value)}
                  className="w-full bg-[#1D2126] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[13.5px] focus:border-[#F2B705] outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#9BA1A8] font-medium mb-1">
                  Version Label
                </label>
                <input
                  type="text"
                  value={termsVersion}
                  onChange={(e) => setTermsVersion(e.target.value)}
                  placeholder="e.g. Version 2.4"
                  className="w-full bg-[#1D2126] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[13.5px] focus:border-[#F2B705] outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#9BA1A8] font-medium mb-1">
                  Last Updated
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={termsLastUpdated}
                    onChange={(e) => setTermsLastUpdated(e.target.value)}
                    className="flex-1 bg-[#1D2126] border border-[#333A41] rounded-[10px] px-3 py-2 text-[#F3F1EA] text-[13.5px] focus:border-[#F2B705] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setTermsLastUpdated(
                        new Date().toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      )
                    }
                    className="px-2.5 py-2 bg-[#262C33] text-[11px] text-[#F3F1EA] rounded-[8px] hover:bg-[#333A41] whitespace-nowrap"
                  >
                    Today
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-[#9BA1A8] font-medium mb-1">
                  Governing Jurisdiction
                </label>
                <input
                  type="text"
                  value={termsJurisdiction}
                  onChange={(e) => setTermsJurisdiction(e.target.value)}
                  placeholder="e.g. Republic of Uganda"
                  className="w-full bg-[#1D2126] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[13.5px] focus:border-[#F2B705] outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#9BA1A8] font-medium mb-1">
                  Legal Compliance Email
                </label>
                <input
                  type="email"
                  value={termsLegalEmail}
                  onChange={(e) => setTermsLegalEmail(e.target.value)}
                  className="w-full bg-[#1D2126] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[13.5px] focus:border-[#F2B705] outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#9BA1A8] font-medium mb-1">
                  Support Care Email
                </label>
                <input
                  type="email"
                  value={termsSupportEmail}
                  onChange={(e) => setTermsSupportEmail(e.target.value)}
                  className="w-full bg-[#1D2126] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[13.5px] focus:border-[#F2B705] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] text-[#9BA1A8] font-medium mb-1">
                Subtitle / Preamble
              </label>
              <input
                type="text"
                value={termsSubtitle}
                onChange={(e) => setTermsSubtitle(e.target.value)}
                className="w-full bg-[#1D2126] border border-[#333A41] rounded-[10px] px-3.5 py-2 text-[#F3F1EA] text-[13.5px] focus:border-[#F2B705] outline-none"
              />
            </div>

            <div>
              <label className="block text-[12px] text-[#9BA1A8] font-medium mb-1">
                Executive Summary
              </label>
              <textarea
                rows={3}
                value={termsExecutiveSummary}
                onChange={(e) => setTermsExecutiveSummary(e.target.value)}
                className="w-full bg-[#1D2126] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[13.5px] focus:border-[#F2B705] outline-none resize-y"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetTermsDefaults}
                className="px-4 py-2 text-[12px] text-[#9BA1A8] hover:text-[#F3F1EA] flex items-center gap-1.5 rounded-[8px] bg-[#1D2126] hover:bg-[#262C33] border border-[#333A41]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset 11 Sections to Defaults</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveTerms()}
                disabled={isSavingTerms}
                className="px-5 py-2 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] font-bold text-[13px] rounded-[8px] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingTerms ? 'Saving...' : 'Save Terms Overview'}</span>
              </button>
            </div>
          </div>

          {/* Terms Sections Management */}
          <div className="bg-[#14171A] border border-[#333A41] rounded-[16px] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#333A41]">
              <div>
                <h3 className="text-[15px] font-bold text-[#F3F1EA] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#F2B705]" />
                  <span>Terms & Conditions Sections ({termsSections.length})</span>
                </h3>
                <p className="text-[12px] text-[#9BA1A8]">
                  Admins can add, update, rearrange, or delete any clause or policy section.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddSection}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] font-bold text-[13px] rounded-full transition-all cursor-pointer shadow-sm"
                id="admin-add-terms-section-btn"
              >
                <Plus className="w-4 h-4" />
                <span>Add Section</span>
              </button>
            </div>

            {/* Sections List */}
            <div className="space-y-3">
              {termsSections.map((sec, idx) => (
                <div
                  key={sec.id || idx}
                  className="bg-[#1D2126] border border-[#333A41] hover:border-[#656C73] rounded-[12px] p-4 flex items-start justify-between gap-4 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#14171A] text-[#F2B705] border border-[#333A41]">
                        #{idx + 1}
                      </span>
                      <h4 className="text-[14.5px] font-bold text-[#F3F1EA] truncate">
                        {sec.title}
                      </h4>
                      <span className="text-[11px] text-[#656C73]">
                        (id: {sec.id})
                      </span>
                    </div>

                    <p className="text-[12.5px] text-[#9BA1A8] line-clamp-2 leading-relaxed">
                      {sec.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveSection(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262C33] rounded disabled:opacity-25 cursor-pointer"
                      title="Move section up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSection(idx, 'down')}
                      disabled={idx === termsSections.length - 1}
                      className="p-1.5 text-[#9BA1A8] hover:text-[#F3F1EA] hover:bg-[#262C33] rounded disabled:opacity-25 cursor-pointer"
                      title="Move section down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditSection(idx)}
                      className="p-1.5 text-[#F2B705] hover:bg-[#F2B705]/10 rounded cursor-pointer"
                      title="Edit section content"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(idx)}
                      className="p-1.5 text-[#E14545] hover:bg-[#E14545]/10 rounded cursor-pointer"
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
      )}

      {/* ======================================================== */}
      {/* LINK ADD/EDIT MODAL */}
      {/* ======================================================== */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1D2126] border border-[#333A41] rounded-[18px] w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#333A41]">
              <h3 className="text-[17px] font-bold text-[#F3F1EA] flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#F2B705]" />
                <span>{editingLinkIndex !== null ? 'Edit Footer Link' : 'Add Footer Link'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-[#9BA1A8] hover:text-[#F3F1EA] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">
                  Link Label (Text displayed)
                </label>
                <input
                  type="text"
                  value={linkFormLabel}
                  onChange={(e) => setLinkFormLabel(e.target.value)}
                  placeholder="e.g. Terms & conditions, Privacy Policy, Help"
                  className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">
                  Link Type
                </label>
                <select
                  value={linkFormType}
                  onChange={(e) => {
                    const newType = e.target.value as 'internal' | 'external' | 'email';
                    setLinkFormType(newType);
                    if (newType === 'internal' && !['home', 'terms', 'jobs', 'support', 'trending', 'music', 'comedy'].includes(linkFormTarget)) {
                      setLinkFormTarget('terms');
                    } else if (newType === 'email' && !linkFormTarget.includes('@')) {
                      setLinkFormTarget('support@ekiboozi.ug');
                    } else if (newType === 'external' && !linkFormTarget.startsWith('http')) {
                      setLinkFormTarget('https://');
                    }
                  }}
                  className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                >
                  <option value="internal">Internal App View (Navigation)</option>
                  <option value="external">External Website (Opens in new tab)</option>
                  <option value="email">Email Link (mailto:)</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">
                  Destination Target
                </label>
                {linkFormType === 'internal' ? (
                  <select
                    value={linkFormTarget}
                    onChange={(e) => setLinkFormTarget(e.target.value)}
                    className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                  >
                    <option value="terms">Terms & Conditions (Dedicated Page)</option>
                    <option value="home">Home / Feed</option>
                    <option value="jobs">Job Opportunities Board</option>
                    <option value="support">Community Support Campaigns</option>
                    <option value="trending">Trending</option>
                    <option value="music">Music</option>
                    <option value="comedy">Comedy</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={linkFormTarget}
                    onChange={(e) => setLinkFormTarget(e.target.value)}
                    placeholder={
                      linkFormType === 'email'
                        ? 'support@ekiboozi.ug'
                        : 'https://example.com'
                    }
                    className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">
                  Order Index
                </label>
                <input
                  type="number"
                  min="1"
                  value={linkFormOrder}
                  onChange={(e) => setLinkFormOrder(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#333A41]">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 text-[#9BA1A8] hover:text-[#F3F1EA] text-[13.5px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLinkItem}
                className="px-5 py-2 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] font-bold text-[13.5px] rounded-[8px]"
              >
                {editingLinkIndex !== null ? 'Save Changes' : 'Add Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TERMS SECTION ADD/EDIT MODAL */}
      {/* ======================================================== */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#1D2126] border border-[#333A41] rounded-[18px] w-full max-w-2xl p-6 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#333A41]">
              <h3 className="text-[17px] font-bold text-[#F3F1EA] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#F2B705]" />
                <span>
                  {editingSectionIndex !== null ? 'Edit Policy Section' : 'Add New Terms Section'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSectionModalOpen(false)}
                className="text-[#9BA1A8] hover:text-[#F3F1EA] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">
                  Section Title (Heading)
                </label>
                <input
                  type="text"
                  value={sectionFormTitle}
                  onChange={(e) => setSectionFormTitle(e.target.value)}
                  placeholder="e.g. 12. Privacy Policy & Data Collection"
                  className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">
                  Section ID / Anchor Slug
                </label>
                <input
                  type="text"
                  value={sectionFormId}
                  onChange={(e) => setSectionFormId(e.target.value)}
                  placeholder="e.g. privacy-policy"
                  className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none"
                />
                <p className="text-[11px] text-[#656C73] mt-1">
                  Used in URL hashes and the Table of Contents.
                </p>
              </div>

              <div>
                <label className="block text-[13px] text-[#9BA1A8] font-medium mb-1">
                  Section Content / Terms Text
                </label>
                <textarea
                  rows={8}
                  value={sectionFormContent}
                  onChange={(e) => setSectionFormContent(e.target.value)}
                  placeholder="Enter the full text, clauses, sub-clauses, and guidelines for this section. Paragraph breaks will be rendered with clean vertical rhythm."
                  className="w-full bg-[#14171A] border border-[#333A41] rounded-[10px] px-3.5 py-2.5 text-[#F3F1EA] text-[14px] focus:border-[#F2B705] outline-none resize-y"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#333A41]">
              <button
                type="button"
                onClick={() => setIsSectionModalOpen(false)}
                className="px-4 py-2 text-[#9BA1A8] hover:text-[#F3F1EA] text-[13.5px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSectionItem}
                className="px-5 py-2 bg-[#F2B705] hover:bg-[#F2B705]/90 text-[#14171A] font-bold text-[13.5px] rounded-[8px]"
              >
                {editingSectionIndex !== null ? 'Update Section' : 'Add Section'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
