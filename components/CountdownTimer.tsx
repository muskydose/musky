'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  endDate: string;
  className?: string;
  compact?: boolean;
}

export default function CountdownTimer({ endDate, className = '', compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endDate).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false,
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (timeLeft.expired) {
    return <span className="text-xs text-stone-400 font-medium">Offer Concluded</span>;
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#c5a059] ${className}`}>
        <Clock className="w-3.5 h-3.5 text-[#c5a059]" />
        <span>
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 font-mono text-xs">
        <div className="bg-black/20 backdrop-blur-xs px-2 py-1 rounded-md text-center min-w-[36px]">
          <span className="block font-bold text-sm leading-tight text-white">{timeLeft.days}</span>
          <span className="text-[9px] uppercase tracking-wider text-stone-300 block">Days</span>
        </div>
        <span className="font-bold text-stone-300">:</span>
        <div className="bg-black/20 backdrop-blur-xs px-2 py-1 rounded-md text-center min-w-[36px]">
          <span className="block font-bold text-sm leading-tight text-white">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-stone-300 block">Hrs</span>
        </div>
        <span className="font-bold text-stone-300">:</span>
        <div className="bg-black/20 backdrop-blur-xs px-2 py-1 rounded-md text-center min-w-[36px]">
          <span className="block font-bold text-sm leading-tight text-white">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-stone-300 block">Min</span>
        </div>
        <span className="font-bold text-stone-300">:</span>
        <div className="bg-black/20 backdrop-blur-xs px-2 py-1 rounded-md text-center min-w-[36px]">
          <span className="block font-bold text-sm leading-tight text-white">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-stone-300 block">Sec</span>
        </div>
      </div>
    </div>
  );
}
