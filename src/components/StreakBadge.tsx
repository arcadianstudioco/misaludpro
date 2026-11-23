import React from 'react';
import { Flame } from 'lucide-react';
import { getFlameTier, HabitStreakInfo } from '../utils/habitStreaks';

interface StreakBadgeProps {
  streak: HabitStreakInfo;
  compact?: boolean;
  showTierLabel?: boolean;
  className?: string;
}

export function StreakBadge({
  streak,
  compact = false,
  showTierLabel = false,
  className = '',
}: StreakBadgeProps) {
  const tier = getFlameTier(streak.days);
  const dayUnit = streak.days === 1 ? 'día' : 'días';

  return (
    <span
      title={`Racha: ${streak.days} ${dayUnit} (${tier.label})${
        streak.days > 0 && !streak.completedToday
          ? ' · Completa hoy para sumar +1'
          : ''
      }`}
      className={`inline-flex items-center gap-1 rounded-full border font-mono-nums transition-all duration-300 ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      } ${tier.bgClass} ${tier.borderClass} ${tier.textClass} ${
        streak.days > 0 && !streak.completedToday ? 'opacity-85' : 'opacity-100'
      } ${className}`}
    >
      <Flame
        className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0 transition-all duration-300`}
        style={{
          color: tier.hex,
          fill: streak.days > 0 ? tier.fillHex : 'transparent',
          filter: tier.glowShadow,
        }}
      />
      <span className="font-semibold leading-none tabular-nums">
        {compact ? `${streak.days}d` : `${streak.days} ${dayUnit}`}
      </span>
      {showTierLabel && streak.days > 0 && (
        <span className="font-sans text-[10px] font-medium opacity-85">
          · {tier.label}
        </span>
      )}
    </span>
  );
}
