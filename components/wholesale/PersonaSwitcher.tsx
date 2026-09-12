'use client';

import React from 'react';
import { Scissors, Sparkles, Package } from 'lucide-react';

export type BuyerPersona = 'salon' | 'artist' | 'bulk';

export interface PersonaConfig {
  id: BuyerPersona;
  label: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultBusinessType: string;
  defaultPresetQuantities: number[];
  ctaLabel: string;
  preferredCategories?: string[];
}

export const PERSONA_CONFIGS: Record<BuyerPersona, PersonaConfig> = {
  bulk: {
    id: 'bulk',
    label: 'Reseller & Wholesaler',
    tagline: 'Direct factory commercial sacks, master cartons & distributor terms',
    icon: Package,
    defaultBusinessType: 'WHOLESALE',
    defaultPresetQuantities: [25, 50, 100, 250],
    ctaLabel: 'Request Commercial Bulk Quote',
    preferredCategories: ['Bulk Commercial', 'Raw Sacks', 'All Products'],
  },
  artist: {
    id: 'artist',
    label: 'Bridal Mehndi Artists',
    tagline: 'Ultra-fine sifted powder & ready cone supplies for professional artists',
    icon: Sparkles,
    defaultBusinessType: 'MEHNDI_ARTIST',
    defaultPresetQuantities: [1, 2, 5, 10],
    ctaLabel: 'Request Artist Batch Quote',
    preferredCategories: ['Henna & Herbal Powders', 'Cones & Applicators'],
  },
  salon: {
    id: 'salon',
    label: 'Salons & Spas',
    tagline: 'Salon master packs, consistent batch quality & commercial volume rates',
    icon: Scissors,
    defaultBusinessType: 'SALON',
    defaultPresetQuantities: [5, 10, 25, 50],
    ctaLabel: 'Request Salon Wholesale Quote',
    preferredCategories: ['Henna & Herbal Powders', 'Hair Care', 'Bulk Packs'],
  },
};

interface PersonaSwitcherProps {
  activePersona: BuyerPersona;
  onPersonaChange: (persona: BuyerPersona) => void;
}

export default function PersonaSwitcher({
  activePersona,
  onPersonaChange,
}: PersonaSwitcherProps) {
  const personas: BuyerPersona[] = ['bulk', 'artist', 'salon'];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        role="tablist"
        aria-label="Buyer Persona Selection"
        className="p-1.5 bg-[#0b241b]/80 border border-[#2d6a4f]/60 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-1.5 backdrop-blur-sm"
      >
        {personas.map((pKey) => {
          const cfg = PERSONA_CONFIGS[pKey];
          const Icon = cfg.icon;
          const isActive = activePersona === pKey;

          return (
            <button
              key={cfg.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`persona-panel-${cfg.id}`}
              id={`persona-tab-${cfg.id}`}
              onClick={() => onPersonaChange(cfg.id)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer min-h-[44px] ${
                isActive
                  ? 'bg-[#c5a059] text-[#0f2d22] shadow-md font-bold'
                  : 'text-[#b2c8be] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0f2d22]' : 'text-[#c5a059]'}`} />
              <span className="truncate sm:whitespace-nowrap">{cfg.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

