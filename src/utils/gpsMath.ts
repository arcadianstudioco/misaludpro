import { GpsRoutePoint, OutdoorActivityType } from '../types/health';

const EARTH_RADIUS_M = 6371000;

export function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function totalRouteDistanceMeters(points: GpsRoutePoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = haversineDistanceMeters(points[i - 1], points[i]);
    if (seg >= 0.4 && seg <= 250) {
      total += seg;
    }
  }
  return total;
}

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

export function metersToKm(meters: number): number {
  return meters / 1000;
}

export function formatStopwatchDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function formatPacePerMile(durationSec: number, miles: number): string {
  if (miles < 0.01 || durationSec < 3) return `--'--'' /MI`;
  const secPerMile = Math.min(3599, Math.round(durationSec / miles));
  const m = Math.floor(secPerMile / 60);
  const s = secPerMile % 60;
  return `${m}'${String(s).padStart(2, '0')}" /MI`;
}

export function formatPacePerKm(durationSec: number, km: number): string {
  if (km < 0.015 || durationSec < 3) return `--'--'' /KM`;
  const secPerKm = Math.min(3599, Math.round(durationSec / km));
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}'${String(s).padStart(2, '0')}" /KM`;
}

export function computeAltitudeGainFeet(points: GpsRoutePoint[]): number {
  if (points.length === 0) return 2;
  let gainM = 0;
  let prevAlt = points[0].altitudeM ?? null;
  for (let i = 1; i < points.length; i++) {
    const alt = points[i].altitudeM ?? null;
    if (alt !== null && prevAlt !== null && alt > prevAlt) {
      gainM += alt - prevAlt;
    }
    if (alt !== null) prevAlt = alt;
  }
  return Math.max(2, Math.round(gainM * 3.28084));
}

export function estimateCalories(
  activity: OutdoorActivityType,
  durationSec: number,
  distanceMiles: number,
  weightKg: number
): { active: number; total: number } {
  const hours = durationSec / 3600;
  const met = activity === 'Carrera al aire libre' ? 9.2 : 4.1;
  const distBonus =
    distanceMiles * (activity === 'Carrera al aire libre' ? 1.03 : 0.72) * weightKg;
  const timeActive = Math.round((met - 1) * weightKg * hours);
  const active = Math.max(1, Math.round(Math.max(timeActive, distBonus * 0.85)));
  const bmrDuring = Math.max(1, Math.round(1.25 * weightKg * hours));
  return {
    active,
    total: active + bmrDuring,
  };
}

export function formatSpanishDateRange(startMs: number, endMs: number): string {
  const start = new Date(startMs);
  const end = new Date(endMs);
  const datePart = start.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const fmtTime = (d: Date) => {
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const suffix = h >= 12 ? 'p.m.' : 'a.m.';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m}`;
  };
  const endSuffix = end.getHours() >= 12 ? 'p.m.' : 'a.m.';
  return `${datePart}, ${fmtTime(start)}–${fmtTime(end)} ${endSuffix}`;
}

export function getSegmentColorBySpeed(
  a: GpsRoutePoint,
  b: GpsRoutePoint,
  index: number,
  total: number
): string {
  const speed = b.speedMps ?? a.speedMps;
  if (typeof speed === 'number' && speed > 0) {
    if (speed >= 2.6) return '#5CE626';
    if (speed >= 1.5) return '#FFD60A';
    return '#FF453A';
  }
  const ratio = total > 1 ? index / (total - 1) : 0;
  if (ratio < 0.35) return '#5CE626';
  if (ratio < 0.72) return '#FFD60A';
  return '#FF453A';
}
