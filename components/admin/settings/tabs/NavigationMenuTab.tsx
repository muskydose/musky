'use client';

import React, { useState } from 'react';
import { SiteSettings, NavItem } from '@/lib/types';
import { DEFAULT_NAV_ITEMS } from '@/lib/data-store';
import { Menu, Plus, ArrowUp, ArrowDown, Trash2, Edit3, Check, X, AlertTriangle, RefreshCw, ExternalLink, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';

interface NavigationMenuTabProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
}

export default function NavigationMenuTab({ settings, setSettings }: NavigationMenuTabProps) {
  const CRITICAL_ROUTES = ['/', '/products', '/categories', '/wholesale', '/contact'];
  const navItems = settings.navItems && settings.navItems.length > 0 ? settings.navItems : DEFAULT_NAV_ITEMS;

  const [editingNavId, setEditingNavId] = useState<string | null>(null);
  const [newNavLabel, setNewNavLabel] = useState('');
  const [newNavHref, setNewNavHref] = useState('');
  const [newNavIsCta, setNewNavIsCta] = useState(false);
  const [newNavIsExternal, setNewNavIsExternal] = useState(false);
  const [navWarning, setNavWarning] = useState('');

  const checkNavCriticalWarning = (href: string, action: string) => {
    const clean = href.trim().toLowerCase();
    if (CRITICAL_ROUTES.includes(clean)) {
      setNavWarning(`Critical Route Notice: "${href}" is an essential site route. ${action} may impact primary visitor navigation.`);
      setTimeout(() => setNavWarning(''), 6000);
    }
  };

  const updateNavItemsList = (newList: NavItem[]) => {
    const reindexed = newList.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
    setSettings((prev) => ({ ...prev, navItems: reindexed }));
  };

  const toggleNavItem = (id: string) => {
    const target = navItems.find((item) => item.id === id);
    if (target && target.enabled) {
      checkNavCriticalWarning(target.href, 'Disabling this link');
    }
    const updated = navItems.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item));
    updateNavItemsList(updated);
  };

  const moveNavItemUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...navItems];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    updateNavItemsList(updated);
  };

  const moveNavItemDown = (index: number) => {
    if (index >= navItems.length - 1) return;
    const updated = [...navItems];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    updateNavItemsList(updated);
  };

  const addNavItem = () => {
    if (!newNavLabel.trim() || !newNavHref.trim()) return;
    const newItem: NavItem = {
      id: `nav-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: newNavLabel.trim(),
      href: newNavHref.trim(),
      enabled: true,
      sortOrder: navItems.length + 1,
      isCta: newNavIsCta,
      isExternal: newNavIsExternal,
    };
    updateNavItemsList([...navItems, newItem]);
    setNewNavLabel('');
    setNewNavHref('');
    setNewNavIsCta(false);
    setNewNavIsExternal(false);
  };

  const updateNavItem = (id: string, updates: Partial<NavItem>) => {
    const updated = navItems.map((item) => (item.id === id ? { ...item, ...updates } : item));
    updateNavItemsList(updated);
    setEditingNavId(null);
  };

  const deleteNavItem = (id: string) => {
    const target = navItems.find((item) => item.id === id);
    if (target) {
      checkNavCriticalWarning(target.href, 'Deleting this link');
    }
    const updated = navItems.filter((item) => item.id !== id);
    updateNavItemsList(updated);
    if (editingNavId === id) setEditingNavId(null);
  };

  const resetNavItemsToDefault = () => {
    if (window.confirm('Reset navigation menu to default store links?')) {
      setSettings((prev) => ({ ...prev, navItems: DEFAULT_NAV_ITEMS }));
    }
  };

  return (
    <div className="space-y-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e2d5] pb-3">
              <div>
                <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">Header & Mobile Navigation Menu</h3>
                <p className="text-gray-500 mt-1">
                  Manage navigation links visible across desktop header and mobile menu. Changes apply instantly.
                </p>
              </div>
              <button
                type="button"
                onClick={resetNavItemsToDefault}
                className="self-start sm:self-auto px-3.5 py-2 bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>Reset to Default Navigation</span>
              </button>
            </div>

            {navWarning && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs p-4 rounded-xl font-semibold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>{navWarning}</span>
                </div>
                <button type="button" onClick={() => setNavWarning('')} className="text-amber-700 hover:text-amber-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Existing Nav Links List */}
            <div className="space-y-3">
              <h4 className="font-bold text-[#0f2d22] text-sm flex items-center justify-between">
                <span>Active Menu Items ({navItems.length})</span>
                <span className="text-gray-400 font-normal text-xs">Reorder using arrows</span>
              </h4>

              <div className="space-y-2">
                {navItems.map((item, index) => {
                  const isCritical = CRITICAL_ROUTES.includes(item.href.trim().toLowerCase());
                  const isEditing = editingNavId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        item.enabled ? 'bg-[#fcfbf7] border-[#e8e2d5]' : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Up/Down buttons */}
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveNavItemUp(index)}
                            className="p-1 hover:bg-[#e8e2d5] rounded text-gray-600 disabled:opacity-20 transition-colors"
                            title="Move Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={index === navItems.length - 1}
                            onClick={() => moveNavItemDown(index)}
                            className="p-1 hover:bg-[#e8e2d5] rounded text-gray-600 disabled:opacity-20 transition-colors"
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Order badge */}
                        <span className="w-6 h-6 rounded-full bg-[#1b4332] text-[#c5a059] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        {/* Details or Edit Fields */}
                        {isEditing ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => updateNavItem(item.id, { label: e.target.value })}
                              className="p-2 border border-[#1b4332] rounded-lg text-xs font-bold bg-white"
                              placeholder="Label"
                            />
                            <input
                              type="text"
                              value={item.href}
                              onChange={(e) => updateNavItem(item.id, { href: e.target.value })}
                              className="p-2 border border-[#1b4332] rounded-lg text-xs bg-white"
                              placeholder="URL / Path"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-[#0f2d22] text-sm">{item.label}</span>
                              {item.isCta && (
                                <span className="px-2 py-0.5 bg-[#c5a059] text-white font-bold text-[9px] uppercase rounded-md">
                                  CTA Button Style
                                </span>
                              )}
                              {item.isExternal && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[9px] uppercase rounded-md flex items-center gap-1">
                                  <ExternalLink className="w-2.5 h-2.5" /> External
                                </span>
                              )}
                              {isCritical && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[9px] uppercase rounded-md">
                                  Core System Route
                                </span>
                              )}
                            </div>
                            <span className="text-gray-500 font-mono text-[11px] truncate">{item.href}</span>
                          </div>
                        )}
                      </div>

                      {/* Item Controls */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => setEditingNavId(null)}
                            className="px-3 py-1.5 bg-[#1b4332] text-white font-bold text-xs rounded-lg hover:bg-[#0f2d22]"
                          >
                            Done
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingNavId(item.id)}
                            className="p-2 bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] rounded-lg transition-colors"
                            title="Edit Link"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Visibility Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleNavItem(item.id)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors ${
                            item.enabled
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {item.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{item.enabled ? 'Visible' : 'Hidden'}</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => deleteNavItem(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add New Navigation Link Form */}
            <div className="bg-[#fcfbf7] border border-[#e8e2d5] p-5 rounded-2xl space-y-4">
              <h4 className="font-bold text-[#0f2d22] text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#c5a059]" />
                <span>Add Custom Navigation Link</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Display Label *</label>
                  <input
                    type="text"
                    value={newNavLabel}
                    onChange={(e) => setNewNavLabel(e.target.value)}
                    placeholder="e.g. Special Offers"
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-bold text-[#0f2d22]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">URL / Target Path *</label>
                  <input
                    type="text"
                    value={newNavHref}
                    onChange={(e) => setNewNavHref(e.target.value)}
                    placeholder="e.g. /offers or https://..."
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  />
                </div>

                <div className="flex items-center gap-4 sm:col-span-2 pt-1 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newNavIsCta}
                      onChange={(e) => setNewNavIsCta(e.target.checked)}
                      className="w-4 h-4 accent-[#1b4332] rounded"
                    />
                    <span className="font-semibold text-xs text-[#0f2d22]">Highlight as Call-to-Action (CTA) Button</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newNavIsExternal}
                      onChange={(e) => setNewNavIsExternal(e.target.checked)}
                      className="w-4 h-4 accent-[#1b4332] rounded"
                    />
                    <span className="font-semibold text-xs text-[#0f2d22]">Open in New Window / External Link</span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={addNavItem}
                className="px-5 py-2.5 bg-[#1b4332] hover:bg-[#0f2d22] text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#c5a059]" />
                <span>Add Link To Navigation</span>
              </button>
            </div>
          </div>
    </div>
  );
}
