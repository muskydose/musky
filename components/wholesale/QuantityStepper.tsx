'use client';

import React from 'react';
import { Minus, Plus, Hash } from 'lucide-react';

interface QuantityStepperProps {
  quantity: number;
  unitLabel: string;
  presetQuantities: number[];
  onChange: (qty: number) => void;
  min?: number;
  step?: number;
}

export default function QuantityStepper({
  quantity,
  unitLabel,
  presetQuantities,
  onChange,
  min = 1,
  step = 1,
}: QuantityStepperProps) {
  const handleDecrement = () => {
    const next = Math.max(min, quantity - step);
    onChange(next);
  };

  const handleIncrement = () => {
    onChange(quantity + step);
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      onChange(min);
    } else {
      onChange(Math.max(min, val));
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="wholesale-qty-input"
          className="text-xs font-bold text-[#0f2d22] uppercase tracking-wider flex items-center gap-1.5"
        >
          <Hash className="w-3.5 h-3.5 text-[#c5a059]" />
          <span>Estimated Order Volume</span>
        </label>
        <span className="text-[11px] font-semibold text-[#626c66]">
          Packaging Unit: <strong className="text-[#0f2d22]">{unitLabel}</strong>
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Stepper Input */}
        <div className="inline-flex items-center rounded-xl border border-[#e8e2d5] bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={quantity <= min}
            aria-label={`Decrease volume by ${step} ${unitLabel}`}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[#0f2d22] hover:bg-[#FAF8F5] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="relative flex items-center justify-center px-2">
            <input
              id="wholesale-qty-input"
              type="number"
              min={min}
              step={step}
              value={quantity}
              onChange={handleManualInput}
              aria-label={`Estimated wholesale quantity in ${unitLabel}`}
              className="w-20 text-center font-mono font-bold text-base text-[#0f2d22] bg-transparent focus:outline-none focus:ring-0"
            />
            <span className="text-xs font-semibold text-[#626c66] ml-1 select-none">
              {unitLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={handleIncrement}
            aria-label={`Increase volume by ${step} ${unitLabel}`}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[#0f2d22] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets */}
        {presetQuantities && presetQuantities.length > 0 && (
          <div
            role="group"
            aria-label="Quick quantity presets"
            className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none"
          >
            <span className="text-[11px] text-[#88908a] font-medium hidden sm:inline mr-1">
              Presets:
            </span>
            {presetQuantities.map((preset) => {
              const isSelected = quantity === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange(preset)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono font-semibold transition-all min-h-[40px] cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#1b4332] text-[#c5a059] shadow-xs ring-1 ring-[#1b4332]'
                      : 'bg-[#FAF8F5] text-[#0f2d22] border border-[#e8e2d5] hover:bg-[#e8e2d5]/60'
                  }`}
                >
                  {preset} {unitLabel}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

