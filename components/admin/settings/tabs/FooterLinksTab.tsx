'use client';

import React, { useState } from 'react';
import { SiteSettings, FooterSectionConfig, FooterLink } from '@/lib/types';
import { DEFAULT_FOOTER_SECTIONS } from '@/lib/data-store';
import { Link2, Plus, ArrowUp, ArrowDown, Trash2, Edit3, Check, X, RefreshCw, ExternalLink, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';

interface FooterLinksTabProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
}

export default function FooterLinksTab({ settings, setSettings }: FooterLinksTabProps) {
  const footerSections = settings.footerSections && settings.footerSections.length > 0
    ? settings.footerSections
    : DEFAULT_FOOTER_SECTIONS;

  const [newFooterSecTitle, setNewFooterSecTitle] = useState('');
  const [activeAddingLinkSecId, setActiveAddingLinkSecId] = useState<string | null>(null);
  const [newFooterLinkLabel, setNewFooterLinkLabel] = useState('');
  const [newFooterLinkHref, setNewFooterLinkHref] = useState('');
  const [newFooterLinkIsExternal, setNewFooterLinkIsExternal] = useState(false);

  const updateFooterSectionsList = (newList: FooterSectionConfig[]) => {
    const reindexed = newList.map((sec, idx) => ({
      ...sec,
      sortOrder: idx + 1,
      links: (sec.links || []).map((lnk, lIdx) => ({ ...lnk, sortOrder: lIdx + 1 })),
    }));
    setSettings((prev) => ({ ...prev, footerSections: reindexed }));
  };

  const addFooterSection = () => {
    if (!newFooterSecTitle.trim()) return;
    const newSec: FooterSectionConfig = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newFooterSecTitle.trim(),
      enabled: true,
      sortOrder: footerSections.length + 1,
      links: [],
    };
    updateFooterSectionsList([...footerSections, newSec]);
    setNewFooterSecTitle('');
  };

  const toggleFooterSection = (sId: string) => {
    const updated = footerSections.map((sec) => (sec.id === sId ? { ...sec, enabled: !sec.enabled } : sec));
    updateFooterSectionsList(updated);
  };

  const moveFooterSectionUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...footerSections];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    updateFooterSectionsList(updated);
  };

  const moveFooterSectionDown = (index: number) => {
    if (index >= footerSections.length - 1) return;
    const updated = [...footerSections];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    updateFooterSectionsList(updated);
  };

  const updateFooterSectionTitle = (sId: string, title: string) => {
    const updated = footerSections.map((sec) => (sec.id === sId ? { ...sec, title } : sec));
    updateFooterSectionsList(updated);
  };

  const deleteFooterSection = (sId: string) => {
    const updated = footerSections.filter((sec) => sec.id !== sId);
    updateFooterSectionsList(updated);
  };

  const addFooterLink = (sId: string) => {
    if (!newFooterLinkLabel.trim() || !newFooterLinkHref.trim()) return;
    const newLnk: FooterLink = {
      id: `lnk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: newFooterLinkLabel.trim(),
      href: newFooterLinkHref.trim(),
      enabled: true,
      sortOrder: 99,
      isExternal: newFooterLinkIsExternal,
    };
    const updated = footerSections.map((sec) => {
      if (sec.id === sId) {
        return {
          ...sec,
          links: [...(sec.links || []), newLnk],
        };
      }
      return sec;
    });
    updateFooterSectionsList(updated);
    setNewFooterLinkLabel('');
    setNewFooterLinkHref('');
    setNewFooterLinkIsExternal(false);
    setActiveAddingLinkSecId(null);
  };

  const toggleFooterLink = (sId: string, lId: string) => {
    const updated = footerSections.map((sec) => {
      if (sec.id === sId) {
        const links = (sec.links || []).map((l) => (l.id === lId ? { ...l, enabled: !l.enabled } : l));
        return { ...sec, links };
      }
      return sec;
    });
    updateFooterSectionsList(updated);
  };

  const moveFooterLinkUp = (sId: string, lIdx: number) => {
    if (lIdx <= 0) return;
    const updated = footerSections.map((sec) => {
      if (sec.id === sId) {
        const links = [...(sec.links || [])];
        const temp = links[lIdx - 1];
        links[lIdx - 1] = links[lIdx];
        links[lIdx] = temp;
        return { ...sec, links };
      }
      return sec;
    });
    updateFooterSectionsList(updated);
  };

  const moveFooterLinkDown = (sId: string, lIdx: number) => {
    const updated = footerSections.map((sec) => {
      if (sec.id === sId) {
        const links = [...(sec.links || [])];
        if (lIdx >= links.length - 1) return sec;
        const temp = links[lIdx + 1];
        links[lIdx + 1] = links[lIdx];
        links[lIdx] = temp;
        return { ...sec, links };
      }
      return sec;
    });
    updateFooterSectionsList(updated);
  };

  const updateFooterLink = (sId: string, lId: string, updates: Partial<FooterLink>) => {
    const updated = footerSections.map((sec) => {
      if (sec.id === sId) {
        const links = (sec.links || []).map((l) => (l.id === lId ? { ...l, ...updates } : l));
        return { ...sec, links };
      }
      return sec;
    });
    updateFooterSectionsList(updated);
  };

  const deleteFooterLink = (sId: string, lId: string) => {
    const updated = footerSections.map((sec) => {
      if (sec.id === sId) {
        const links = (sec.links || []).filter((l) => l.id !== lId);
        return { ...sec, links };
      }
      return sec;
    });
    updateFooterSectionsList(updated);
  };

  const resetFooterSectionsToDefault = () => {
    if (window.confirm('Reset all footer links and columns to store default layout?')) {
      setSettings((prev) => ({ ...prev, footerSections: DEFAULT_FOOTER_SECTIONS }));
    }
  };

  return (
    <div className="space-y-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e2d5] pb-3">
              <div>
                <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">Footer Columns & Custom Links</h3>
                <p className="text-gray-500 mt-1">
                  Manage sections, column headers, and links displayed in the customer-facing footer.
                </p>
              </div>
              <button
                type="button"
                onClick={resetFooterSectionsToDefault}
                className="self-start sm:self-auto px-3.5 py-2 bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>Reset to Default Footer</span>
              </button>
            </div>

            {/* List of Footer Sections */}
            <div className="space-y-6">
              {footerSections.map((sec, sIdx) => {
                const isAddingLink = activeAddingLinkSecId === sec.id;

                return (
                  <div
                    key={sec.id}
                    className={`p-5 rounded-2xl border space-y-4 transition-all ${
                      sec.enabled ? 'bg-[#fcfbf7] border-[#e8e2d5]' : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    {/* Section Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#e8e2d5]">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={sIdx === 0}
                            onClick={() => moveFooterSectionUp(sIdx)}
                            className="p-1 hover:bg-[#e8e2d5] rounded text-gray-600 disabled:opacity-20"
                            title="Move Column Left/Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={sIdx === footerSections.length - 1}
                            onClick={() => moveFooterSectionDown(sIdx)}
                            className="p-1 hover:bg-[#e8e2d5] rounded text-gray-600 disabled:opacity-20"
                            title="Move Column Right/Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex-1 max-w-sm">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Column Header Title</label>
                          <input
                            type="text"
                            value={sec.title}
                            onChange={(e) => updateFooterSectionTitle(sec.id, e.target.value)}
                            className="w-full p-2 border border-[#1b4332] rounded-lg font-serif-heading font-bold text-sm bg-white text-[#0f2d22]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          type="button"
                          onClick={() => toggleFooterSection(sec.id)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors ${
                            sec.enabled
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {sec.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{sec.enabled ? 'Section Visible' : 'Section Hidden'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteFooterSection(sec.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Section Links List */}
                    <div className="space-y-2 pl-2">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                        <span>Column Links ({(sec.links || []).length})</span>
                      </div>

                      {(sec.links || []).map((link, lIdx) => {
                        return (
                          <div
                            key={link.id}
                            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              link.enabled ? 'bg-white border-[#e8e2d5]' : 'bg-gray-100 border-gray-200 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={lIdx === 0}
                                  onClick={() => moveFooterLinkUp(sec.id, lIdx)}
                                  className="p-1 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-20"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={lIdx === (sec.links || []).length - 1}
                                  onClick={() => moveFooterLinkDown(sec.id, lIdx)}
                                  className="p-1 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-20"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <input
                                type="text"
                                value={link.label}
                                onChange={(e) => updateFooterLink(sec.id, link.id, { label: e.target.value })}
                                className="p-1.5 border border-gray-300 rounded text-xs font-bold text-[#0f2d22] w-36"
                                placeholder="Link Label"
                              />

                              <input
                                type="text"
                                value={link.href}
                                onChange={(e) => updateFooterLink(sec.id, link.id, { href: e.target.value })}
                                className="p-1.5 border border-gray-300 rounded text-xs text-gray-700 flex-1 min-w-0"
                                placeholder="URL / Path"
                              />
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => toggleFooterLink(sec.id, link.id)}
                                className={`px-2.5 py-1 rounded font-semibold text-[11px] ${
                                  link.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {link.enabled ? 'Visible' : 'Hidden'}
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteFooterLink(sec.id, link.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Delete Link"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add Link to Section */}
                      {isAddingLink ? (
                        <div className="p-3 bg-white border border-[#1b4332] rounded-xl space-y-3 mt-2">
                          <span className="font-bold text-xs text-[#0f2d22] block">Add New Link to &ldquo;{sec.title}&rdquo;</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={newFooterLinkLabel}
                              onChange={(e) => setNewFooterLinkLabel(e.target.value)}
                              placeholder="Link Label (e.g. Quality Certificate)"
                              className="p-2 border border-[#e8e2d5] rounded-lg text-xs"
                            />
                            <input
                              type="text"
                              value={newFooterLinkHref}
                              onChange={(e) => setNewFooterLinkHref(e.target.value)}
                              placeholder="Path / URL (e.g. /about)"
                              className="p-2 border border-[#e8e2d5] rounded-lg text-xs"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newFooterLinkIsExternal}
                                onChange={(e) => setNewFooterLinkIsExternal(e.target.checked)}
                                className="w-3.5 h-3.5 accent-[#1b4332]"
                              />
                              <span>External Link</span>
                            </label>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveAddingLinkSecId(null)}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 font-bold rounded-lg text-xs"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => addFooterLink(sec.id)}
                                className="px-3 py-1.5 bg-[#1b4332] text-white font-bold rounded-lg text-xs"
                              >
                                Save Link
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveAddingLinkSecId(sec.id)}
                          className="px-3 py-1.5 bg-white border border-[#e8e2d5] hover:bg-[#f5f1e8] text-[#0f2d22] font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors mt-2"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#c5a059]" />
                          <span>Add Link to Column</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add New Footer Column Section */}
            <div className="bg-[#fcfbf7] border border-[#e8e2d5] p-5 rounded-2xl space-y-3">
              <h4 className="font-bold text-[#0f2d22] text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#c5a059]" />
                <span>Add New Footer Column / Section</span>
              </h4>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newFooterSecTitle}
                  onChange={(e) => setNewFooterSecTitle(e.target.value)}
                  placeholder="Column Header Title (e.g. Customer Care)"
                  className="flex-1 p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-bold text-[#0f2d22]"
                />
                <button
                  type="button"
                  onClick={addFooterSection}
                  className="px-5 py-2.5 bg-[#1b4332] hover:bg-[#0f2d22] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4 text-[#c5a059]" />
                  <span>Create Footer Column</span>
                </button>
              </div>
            </div>
          </div>
    </div>
  );
}
