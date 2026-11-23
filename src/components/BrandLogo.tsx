import React, { useState } from 'react';
import { Dumbbell, Flame, HeartPulse, Sparkles, User, Utensils } from 'lucide-react';

export const IMAGE_ASSETS = {
  welcomeHero: '/src/assets/images/welcome_athlete_hero_1795375176051.jpg',
  strengthHero: '/src/assets/images/routine_strength_hero_1795375174832.jpg',
  cardioThumb: '/src/assets/images/routine_cardio_thumb_1795375176185.jpg',
  mobilityThumb: '/src/assets/images/routine_mobility_thumb_1795375175433.jpg',
  kegelThumb: '/src/assets/images/routine_kegel_thumb_1795375176212.jpg',
  mealBowl: '/src/assets/images/nutrition_meal_bowl_1795375176431.jpg',
  userAvatar: '/src/assets/images/user_profile_avatar_1795375176207.jpg',
} as const;

export function BrandLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="msp-grad" x1="4" y1="40" x2="44" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#46B825" />
          <stop offset="100%" stopColor="#86EC42" />
        </linearGradient>
      </defs>
      <path
        d="M6 34L15.5 14.5C16.2 13.1 18.2 13.1 18.9 14.5L24.5 26L31.5 14L38.5 22.5"
        stroke="url(#msp-grad)"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27.5 34L38.5 17.5"
        stroke="#7EE63B"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M32 16.5H40V24.5"
        stroke="#7EE63B"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UserAvatarImage({
  name,
  sizeClass = 'w-9 h-9',
  customUrl,
}: {
  name: string;
  sizeClass?: string;
  customUrl?: string;
}) {
  const [failed, setFailed] = useState(false);

  const imgSrc = customUrl && customUrl.trim() ? customUrl : IMAGE_ASSETS.userAvatar;

  if (failed && !customUrl) {
    const initials = name
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
    return (
      <div
        className={`${sizeClass} rounded-full bg-[#19231D] border border-[#74D834]/45 flex items-center justify-center text-xs font-display font-bold text-[#74D834] shrink-0`}
      >
        {initials || <User className="w-4 h-4" />}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={`Foto de perfil de ${name}`}
      referrerPolicy="no-referrer"
      onError={() => {
        if (customUrl) {
          // If customUrl failed, try fallback
          setFailed(true);
        } else {
          setFailed(true);
        }
      }}
      className={`${sizeClass} rounded-full object-cover border border-[#74D834]/50 shrink-0 bg-[#141C17]`}
    />
  );
}

export function WelcomeHeroArtwork() {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative w-full h-80 overflow-hidden bg-[#0A0D0B]">
      {!failed ? (
        <img
          src={IMAGE_ASSETS.welcomeHero}
          alt="Atleta entrenando en estudio oscuro Mi Salud Pro"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-b from-[#17281C] to-[#0A0D0B] flex items-center justify-center">
          <Dumbbell className="w-12 h-12 text-[#74D834]/50" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-[#0A0D0B]/35 to-[#0A0D0B] welcome-hero-fade" />
    </div>
  );
}

export function RoutineThumbnailArtwork({
  type,
  featured = false,
}: {
  type: 'strength' | 'cardio' | 'mobility' | 'kegel';
  featured?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  const srcMap = {
    strength: IMAGE_ASSETS.strengthHero,
    cardio: IMAGE_ASSETS.cardioThumb,
    mobility: IMAGE_ASSETS.mobilityThumb,
    kegel: IMAGE_ASSETS.kegelThumb,
  };

  const altMap = {
    strength: 'Entrenamiento de fuerza con mancuernas',
    cardio: 'Entrenamiento cardiovascular HIIT',
    mobility: 'Ejercicios de movilidad y flexibilidad',
    kegel: 'Guía de ejercicios de suelo pélvico y respiración',
  };

  const fallbackIcon = {
    strength: <Dumbbell className="w-5 h-5 text-[#74D834]" />,
    cardio: <Flame className="w-5 h-5 text-[#E08238]" />,
    mobility: <Sparkles className="w-5 h-5 text-[#4CC9B0]" />,
    kegel: <HeartPulse className="w-5 h-5 text-[#74D834]" />,
  }[type];

  return (
    <div
      className={`relative overflow-hidden bg-[#131A16] border border-white/10 ${
        featured ? 'w-full h-40 rounded-2xl' : 'w-14 h-14 rounded-xl shrink-0'
      } flex items-center justify-center`}
    >
      {!failed ? (
        <img
          src={srcMap[type]}
          alt={altMap[type]}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#1C2720] to-[#0B100D] flex items-center justify-center">
          {fallbackIcon}
        </div>
      )}
      {featured && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D130F]/80 via-transparent to-transparent" />
      )}
    </div>
  );
}

export function MealBowlArtwork({ compact = false }: { compact?: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`relative overflow-hidden bg-[#131A16] border border-white/10 ${
        compact ? 'w-11 h-11 rounded-xl shrink-0' : 'w-full h-40 rounded-2xl'
      } flex items-center justify-center`}
    >
      {!failed ? (
        <img
          src={IMAGE_ASSETS.mealBowl}
          alt="Plato saludable con pollo, aguacate, huevo y quinoa"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#1C271E] to-[#0C100D] flex items-center justify-center">
          <Utensils className="w-5 h-5 text-[#74D834]" />
        </div>
      )}
      {!compact && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D120F]/75 via-transparent to-transparent" />
      )}
    </div>
  );
}
