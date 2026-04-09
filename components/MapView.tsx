'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export interface MapPin {
  lat: number;
  lng: number;
  name: string;
  id?: string;
}

interface MapViewProps {
  pins: MapPin[];
  center?: [number, number];
  zoom?: number;
  singlePin?: boolean;
  onPinClick?: (id: string) => void;
  height?: string;
}

// Standalone helpers — no closure over component props
function makeIcon(L: any, active: boolean, large: boolean) {
  const size = active ? 12 : 8;
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:#C8FF00;
      outline:2px solid #080808;
      box-shadow:0 0 ${active ? 12 : 6}px #C8FF00;
      transition:all 0.2s;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: '',
  });
}

function addMarkersToMap(
  L: any,
  map: any,
  pins: MapPin[],
  singlePin: boolean,
  markersRef: React.MutableRefObject<any[]>,
  onPinClickRef: React.MutableRefObject<((id: string) => void) | undefined>,
) {
  markersRef.current.forEach(m => m.remove());
  markersRef.current = [];

  pins.forEach((pin) => {
    const marker = L.marker([pin.lat, pin.lng], { icon: makeIcon(L, singlePin, singlePin) })
      .addTo(map);

    if (pin.name) {
      marker.bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;font-weight:600;color:#f0f0f0;padding:2px 0">${pin.name}</div>`,
        { closeButton: false, offset: [0, -4] },
      );
    }

    if (pin.id && onPinClickRef.current) {
      marker.on('click', () => onPinClickRef.current?.(pin.id!));
    } else if (singlePin && pin.name) {
      marker.openPopup();
    }

    marker.on('mouseover', function(this: any) { this.setIcon(makeIcon(L, true, singlePin)); });
    marker.on('mouseout',  function(this: any) { this.setIcon(makeIcon(L, singlePin, singlePin)); });

    markersRef.current.push(marker);
  });
}

function MapView({
  pins,
  center,
  zoom = 13,
  singlePin = false,
  onPinClick,
  height = '100%',
}: MapViewProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<any>(null);
  const leafletRef    = useRef<any>(null);
  const markersRef    = useRef<any[]>([]);
  const pinsRef       = useRef(pins);
  const singlePinRef  = useRef(singlePin);
  const onPinClickRef = useRef(onPinClick);

  // Keep callback ref current without triggering effects
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);

  // ── Init map once on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let active = true;

    import('leaflet').then((L) => {
      if (!active || !containerRef.current || mapRef.current) return;

      const currentPins = pinsRef.current;
      if (currentPins.length === 0) return;

      const defaultCenter: [number, number] = center ?? (
        currentPins.length === 1
          ? [currentPins[0].lat, currentPins[0].lng]
          : [
              currentPins.reduce((s, p) => s + p.lat, 0) / currentPins.length,
              currentPins.reduce((s, p) => s + p.lng, 0) / currentPins.length,
            ]
      );

      const map = L.map(containerRef.current!, {
        center: defaultCenter,
        zoom: singlePinRef.current ? 15 : zoom,
        zoomControl: true,
        scrollWheelZoom: !singlePinRef.current,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        crossOrigin: '',
      }).addTo(map);

      leafletRef.current = L;
      mapRef.current = map;

      addMarkersToMap(L, map, currentPins, singlePinRef.current, markersRef, onPinClickRef);

      // Debounced invalidateSize — no tileLayer.redraw() which causes tile flicker
      let roTimer: ReturnType<typeof setTimeout>;
      const invalidate = () => {
        clearTimeout(roTimer);
        roTimer = setTimeout(() => { map.invalidateSize(); }, 80);
      };

      // Initial layout settle
      const t1 = setTimeout(() => map.invalidateSize(), 100);
      const t2 = setTimeout(() => map.invalidateSize(), 500);

      // ResizeObserver handles all container dimension changes:
      // window resize, viewport height changes (iOS address bar), panel resize
      const ro = new ResizeObserver(invalidate);
      ro.observe(containerRef.current!);

      // orientationchange: wait for layout to settle after rotation
      const onOrient = () => setTimeout(() => map.invalidateSize(), 300);
      window.addEventListener('orientationchange', onOrient);

      (map as any)._cleanup = { ro, t1, t2, onOrient };
    });

    return () => {
      active = false;
      if (mapRef.current) {
        const { ro, t1, t2, onOrient } = (mapRef.current as any)._cleanup ?? {};
        clearTimeout(t1);
        clearTimeout(t2);
        ro?.disconnect();
        window.removeEventListener('orientationchange', onOrient);
        mapRef.current.remove();
        mapRef.current = null;
        leafletRef.current = null;
        markersRef.current = [];
      }
    };
  // center and zoom are only used for initial map setup — intentionally excluded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update markers when pins change — no map remount ──────────────────────
  useEffect(() => {
    pinsRef.current = pins;
    // Map not yet initialized (async leaflet import pending) — init effect will
    // read pinsRef.current when it completes, so markers will be correct
    if (!mapRef.current || !leafletRef.current) return;
    addMarkersToMap(leafletRef.current, mapRef.current, pins, singlePinRef.current, markersRef, onPinClickRef);
  }, [pins]);

  if (pins.length === 0) {
    return (
      <div style={{
        height,
        background: 'var(--off-black)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        fontSize: '0.8rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
      }}>
        Mapa není k dispozici
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height, background: '#111', position: 'relative' }}
    />
  );
}

// Only re-render when pin IDs/positions actually change — prevents re-renders
// caused by parent state changes (activeId, filter count labels, etc.)
export default React.memo(MapView, (prev, next) => {
  if (prev.height    !== next.height)    return false;
  if (prev.zoom      !== next.zoom)      return false;
  if (prev.singlePin !== next.singlePin) return false;
  if (prev.pins.length !== next.pins.length) return false;
  const prevKey = prev.pins.map(p => p.id ?? `${p.lat},${p.lng}`).join('|');
  const nextKey = next.pins.map(p => p.id ?? `${p.lat},${p.lng}`).join('|');
  return prevKey === nextKey; // true = equal = skip re-render
});
