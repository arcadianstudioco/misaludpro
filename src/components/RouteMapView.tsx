import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GpsRoutePoint } from '../types/health';
import { getSegmentColorBySpeed } from '../utils/gpsMath';

interface RouteMapViewProps {
  points: GpsRoutePoint[];
  center?: { lat: number; lng: number };
  mapStyle?: 'dark' | 'satellite';
  isLive?: boolean;
  className?: string;
}

const TILE_URLS: Record<'dark' | 'satellite', string> = {
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

export function RouteMapView({
  points,
  center,
  mapStyle = 'dark',
  isLive = false,
  className,
}: RouteMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet map once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const initialLat = center?.lat ?? points[0]?.lat ?? 19.4326;
    const initialLng = center?.lng ?? points[0]?.lng ?? -99.1332;

    const map = L.map(el, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: true,
    });

    map.attributionControl.setPrefix('');

    const tiles = L.tileLayer(TILE_URLS[mapStyle], {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const routeGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tiles;
    routeLayerRef.current = routeGroup;

    // Ensure Leaflet recalculates size inside flex/modal containers
    const timer1 = window.setTimeout(() => map.invalidateSize(), 120);
    const timer2 = window.setTimeout(() => map.invalidateSize(), 380);

    return () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  // Switch tile layer when mapStyle changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const nextTiles = L.tileLayer(TILE_URLS[mapStyle], {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    tileLayerRef.current = nextTiles;
  }, [mapStyle]);

  // Draw speed-colored route segments + start/end markers + pan/fitBounds
  useEffect(() => {
    const map = mapRef.current;
    const group = routeLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Draw each GPS segment colored by pace/speed (like Apple Fitness)
    if (points.length >= 2) {
      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const color = getSegmentColorBySpeed(p1, p2, i - 1, points.length - 1);
        L.polyline(
          [
            [p1.lat, p1.lng],
            [p2.lat, p2.lng],
          ],
          {
            color,
            weight: 6,
            opacity: 0.96,
            lineCap: 'round',
            lineJoin: 'round',
          }
        ).addTo(group);
      }
    }

    // Start marker (green)
    if (points.length >= 1) {
      const start = points[0];
      L.circleMarker([start.lat, start.lng], {
        radius: 6,
        color: '#FFFFFF',
        weight: 2,
        fillColor: '#4CD964',
        fillOpacity: 1,
      }).addTo(group);
    }

    // End / Live current position marker
    const liveCoord =
      points.length > 0
        ? points[points.length - 1]
        : center
          ? { lat: center.lat, lng: center.lng }
          : null;

    if (liveCoord && (points.length > 1 || isLive)) {
      if (isLive) {
        L.circleMarker([liveCoord.lat, liveCoord.lng], {
          radius: 14,
          color: '#0A95FF',
          weight: 0,
          fillColor: '#0A95FF',
          fillOpacity: 0.25,
        }).addTo(group);
      }
      L.circleMarker([liveCoord.lat, liveCoord.lng], {
        radius: 7,
        color: '#FFFFFF',
        weight: 2.2,
        fillColor: isLive ? '#0A95FF' : '#FF3B30',
        fillOpacity: 1,
      }).addTo(group);
    }

    // Camera positioning
    map.invalidateSize();
    if (isLive && center) {
      map.panTo([center.lat, center.lng], { animate: true });
    } else if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [44, 44], maxZoom: 17 });
      window.setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          mapRef.current.fitBounds(bounds, { padding: [44, 44], maxZoom: 17 });
        }
      }, 220);
    } else if (center) {
      map.setView([center.lat, center.lng], 16);
    }
  }, [points, center, isLive]);

  return (
    <div className={className ? `relative ${className}` : 'relative w-full h-full'}>
      <div
        ref={containerRef}
        className={`w-full h-full bg-[#1B2432] ${mapStyle === 'dark' ? 'map-dark-tiles' : ''}`}
      />
    </div>
  );
}
