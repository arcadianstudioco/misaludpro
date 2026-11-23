/// <reference types="google.maps" />
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  ColorScheme,
  Map as GoogleMapView,
  Polyline,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import { GpsRoutePoint } from '../types/health';
import { getSegmentColorBySpeed } from '../utils/gpsMath';

interface RouteMapViewProps {
  points: GpsRoutePoint[];
  center?: { lat: number; lng: number };
  mapStyle?: 'dark' | 'satellite';
  isLive?: boolean;
  className?: string;
}

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

function FitRouteController({
  points,
  center,
  isLive,
}: {
  points: GpsRoutePoint[];
  center?: { lat: number; lng: number };
  isLive?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (isLive && center) {
      map.panTo(center);
      return;
    }
    if (points.length >= 2 && typeof google !== 'undefined' && google.maps) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, { top: 56, right: 44, bottom: 56, left: 44 });
    } else if (center) {
      map.setCenter(center);
      map.setZoom(16);
    }
  }, [map, points, center, isLive]);

  return null;
}

function GoogleRouteInner({
  points,
  center,
  mapStyle = 'dark',
  isLive,
  onFallback,
}: RouteMapViewProps & { onFallback: () => void }) {
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
      onFallback();
    }
  }, [status, onFallback]);

  const initialCenter = useMemo(() => {
    if (center) return center;
    if (points.length > 0) return { lat: points[0].lat, lng: points[0].lng };
    return { lat: 19.4326, lng: -99.1332 };
  }, [center, points]);

  const segments = useMemo(() => {
    if (points.length < 2) return [];
    const list: { path: google.maps.LatLngLiteral[]; color: string; key: string }[] = [];
    for (let i = 1; i < points.length; i++) {
      list.push({
        key: `seg-${i}`,
        path: [
          { lat: points[i - 1].lat, lng: points[i - 1].lng },
          { lat: points[i].lat, lng: points[i].lng },
        ],
        color: getSegmentColorBySpeed(points[i - 1], points[i], i - 1, points.length - 1),
      });
    }
    return list;
  }, [points]);

  const startPt = points[0];
  const endPt = points[points.length - 1];

  return (
    <GoogleMapView
      mapId="DEMO_MAP_ID"
      colorScheme={ColorScheme.DARK}
      mapTypeId={mapStyle === 'satellite' ? 'hybrid' : 'roadmap'}
      defaultCenter={initialCenter}
      defaultZoom={16}
      gestureHandling="greedy"
      disableDefaultUI={true}
      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      className="w-full h-full"
    >
      <FitRouteController points={points} center={center} isLive={isLive} />

      {segments.map((seg) => (
        <Polyline
          key={seg.key}
          path={seg.path}
          strokeColor={seg.color}
          strokeOpacity={0.96}
          strokeWeight={6}
        />
      ))}

      {startPt && (
        <AdvancedMarker position={{ lat: startPt.lat, lng: startPt.lng }} title="Inicio">
          <div className="w-4 h-4 rounded-full bg-[#4CD964] border-2 border-white shadow-md" />
        </AdvancedMarker>
      )}

      {endPt && points.length > 1 && (
        <AdvancedMarker position={{ lat: endPt.lat, lng: endPt.lng }} title="Fin">
          <div
            className={`w-4 h-4 rounded-full border-2 border-white shadow-md ${
              isLive ? 'bg-[#0A95FF] animate-pulse' : 'bg-[#FF3B30]'
            }`}
          />
        </AdvancedMarker>
      )}
    </GoogleMapView>
  );
}

function DarkVectorCanvasMap({
  points,
  center,
  mapStyle = 'dark',
  isLive,
}: RouteMapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(200, Math.round(rect.width));
    const h = Math.max(140, Math.round(rect.height));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Dark slate Apple-Maps-like background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (mapStyle === 'satellite') {
      bgGrad.addColorStop(0, '#18241E');
      bgGrad.addColorStop(1, '#0E1512');
    } else {
      bgGrad.addColorStop(0, '#2F3D52');
      bgGrad.addColorStop(0.75, '#253142');
      bgGrad.addColorStop(1, '#121820');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle urban street blocks + parks matching Apple Maps dark vector look
    ctx.strokeStyle = mapStyle === 'satellite' ? 'rgba(130, 175, 145, 0.16)' : 'rgba(128, 148, 178, 0.22)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const refLat = center?.lat ?? points[0]?.lat ?? 19.4326;
    const refLng = center?.lng ?? points[0]?.lng ?? -99.1332;
    const seed = Math.abs(Math.sin(refLat * 113.1 + refLng * 47.7));

    ctx.lineWidth = 5;
    for (let i = -1; i <= 5; i++) {
      const y = (h / 5) * i + seed * 18;
      ctx.beginPath();
      ctx.moveTo(0, y + 18);
      ctx.bezierCurveTo(w * 0.35, y - 10, w * 0.65, y + 26, w, y - 8);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    for (let i = 0; i <= 6; i++) {
      const x = (w / 6) * i + seed * 12;
      ctx.beginPath();
      ctx.moveTo(x - 14, 0);
      ctx.lineTo(x + 22, h);
      ctx.stroke();
    }

    // Subtle river / park accent arc
    ctx.strokeStyle = 'rgba(42, 86, 145, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.85);
    ctx.quadraticCurveTo(w * 0.55, h * 0.62, w * 0.92, h * 0.72);
    ctx.stroke();

    const activePoints =
      points.length > 0
        ? points
        : center
          ? [{ lat: center.lat, lng: center.lng, timestamp: Date.now() }]
          : [];

    if (activePoints.length === 0) return;

    let minLat = activePoints[0].lat;
    let maxLat = activePoints[0].lat;
    let minLng = activePoints[0].lng;
    let maxLng = activePoints[0].lng;
    for (const p of activePoints) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }

    const latSpan = Math.max(0.0014, maxLat - minLat);
    const lngSpan = Math.max(0.0014, maxLng - minLng);
    const padX = w * 0.22;
    const padY = h * 0.24;
    const drawW = w - padX * 2;
    const drawH = h - padY * 2;
    const scale = Math.min(drawW / lngSpan, drawH / latSpan);
    const offsetX = (w - lngSpan * scale) / 2;
    const offsetY = (h - latSpan * scale) / 2;

    const toXY = (p: { lat: number; lng: number }) => ({
      x: offsetX + (p.lng - minLng) * scale,
      y: h - (offsetY + (p.lat - minLat) * scale),
    });

    if (activePoints.length >= 2) {
      // Soft route drop shadow
      ctx.lineWidth = 9;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      activePoints.forEach((p, idx) => {
        const pt = toXY(p);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Pace-colored segments (green -> yellow -> red)
      ctx.lineWidth = 5;
      for (let i = 1; i < activePoints.length; i++) {
        const p0 = toXY(activePoints[i - 1]);
        const p1 = toXY(activePoints[i]);
        ctx.strokeStyle = getSegmentColorBySpeed(
          activePoints[i - 1],
          activePoints[i],
          i - 1,
          activePoints.length - 1
        );
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }

    // Start marker (green circle with white ring)
    const startXY = toXY(activePoints[0]);
    ctx.beginPath();
    ctx.arc(startXY.x, startXY.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#4CD964';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // End / live marker
    const endXY = toXY(activePoints[activePoints.length - 1]);
    if (activePoints.length > 1 || isLive) {
      if (isLive) {
        ctx.beginPath();
        ctx.arc(endXY.x, endXY.y, 13, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10, 149, 255, 0.25)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(endXY.x, endXY.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = isLive ? '#0A95FF' : '#FF3B30';
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }
  }, [points, center, mapStyle, isLive]);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute bottom-2 left-3 text-[10px] font-mono-nums text-white/60 pointer-events-none">
        {(center?.lat ?? points[0]?.lat ?? 19.4326).toFixed(4)},{' '}
        {(center?.lng ?? points[0]?.lng ?? -99.1332).toFixed(4)}
      </div>
    </div>
  );
}

export function RouteMapView(props: RouteMapViewProps) {
  const [useFallback, setUseFallback] = useState(!GOOGLE_MAPS_API_KEY);

  useEffect(() => {
    const onQuota = () => setUseFallback(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  return (
    <div className={props.className || 'w-full h-full'}>
      {GOOGLE_MAPS_API_KEY && !useFallback ? (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="es">
          <GoogleRouteInner {...props} onFallback={() => setUseFallback(true)} />
        </APIProvider>
      ) : (
        <DarkVectorCanvasMap {...props} />
      )}
    </div>
  );
}
