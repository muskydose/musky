'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { GrowthLead } from '@/lib/growth/types';
import FreshnessBadge from '@/components/growth/FreshnessBadge';
import { Building2, Plus, Phone, MessageCircle, Calendar, UserCheck, Search, Filter } from 'lucide-react';

export default function GrowthLeadsPage() {
  const [leads, setLeads] = useState<GrowthLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [leadType, setLeadType] = useState('Wholesaler');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/admin/growth/leads');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setLeads(data.leads || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !phone) return;

    try {
      const res = await fetch('/api/admin/growth/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          contactName,
          phone,
          leadType,
          state,
          city,
          notes,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setBusinessName('');
        setContactName('');
        setPhone('');
        setCity('');
        setNotes('');
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.businessName.toLowerCase().includes(search.toLowerCase()) ||
      l.contactName.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.state.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'ALL' || l.leadType === filterType;
    return matchSearch && matchType;
  });

  return (
    <AdminLayout title="Growth AI — Wholesale & B2B Lead CRM">
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e2d5] pb-4">
          <div>
            <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">
              Growth CRM & Lead Pipeline
            </h3>
            <p className="text-xs text-[#626c66] mt-0.5">
              Manage wholesalers, retailers, mehndi artists, distributors, and salon contacts across India
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0f2d22]"
          >
            <Plus className="w-4 h-4" />
            <span>Add B2B Lead</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search leads, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            {['ALL', 'Wholesaler', 'Retailer', 'Mehndi Artist', 'Distributor', 'Salon'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                  filterType === t ? 'bg-[#1b4332] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Leads Table */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-[#faf8f5] rounded-xl border border-dashed border-[#e8e2d5]">
            <Building2 className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="font-bold text-gray-700 text-sm">No verified lead records found.</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Add wholesale contacts manually or import CSV lead datasets to build your pipeline.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e8e2d5] bg-[#faf8f5] text-[#626c66] uppercase tracking-wider font-bold">
                  <th className="p-3">Business / Contact</th>
                  <th className="p-3">Phone / WhatsApp</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Source</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2d5]">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-[#fdfbf7]">
                    <td className="p-3">
                      <p className="font-bold text-[#0f2d22]">{l.businessName}</p>
                      <p className="text-[11px] text-gray-500">{l.contactName}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-mono text-gray-800">{l.phone}</p>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                        {l.leadType}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700">{l.city ? `${l.city}, ${l.state}` : l.state}</td>
                    <td className="p-3">
                      <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">{l.source}</td>
                    <td className="p-3 text-right">
                      <a
                        href={`https://wa.me/${l.whatsapp || l.phone}?text=${encodeURIComponent('Hello from Musky Dose Sojat Henna!')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#e8e2d5] p-6 shadow-xl space-y-4">
            <h4 className="font-serif-heading font-bold text-lg text-[#0f2d22]">Add B2B / Wholesale Lead</h4>
            <form onSubmit={handleAddLead} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Royal Henna Traders"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Rajesh Kumar"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. 98290XXXXX"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Lead Type</label>
                  <select
                    value={leadType}
                    onChange={(e) => setLeadType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="Wholesaler">Wholesaler</option>
                    <option value="Retailer">Retailer</option>
                    <option value="Mehndi Artist">Mehndi Artist</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Salon">Salon</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1b4332] text-white font-bold rounded-lg hover:bg-[#0f2d22]"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
