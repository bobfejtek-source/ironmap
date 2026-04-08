'use client';

import { useEffect, useRef } from 'react';
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

export default function MapView({
  pins,
  center,
  zoom = 13,
  singlePin = false,
  onPinClick,
  height = '100%',
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || pins.length === 0) return;

    let active = true;

    import('leaflet').then((L) => {
      if (!active || !containerRef.current || mapRef.current) return;

      const defaultCenter: [number, number] = center || (
        pins.length === 1
          ? [pins[0].lat, pins[0].lng]
          : [
              pins.reduce((s, p) => s + p.lat, 0) / pins.length,
              pins.reduce((s, p) => s + p.lng, 0) / pins.length,
            ]
      );

      const map = L.map(containerRef.current!, {
        center: defaultCenter,
        zoom: singlePin ? 15 : zoom,
        zoomControl: true,
        scrollWheelZoom: !singlePin,
      });

      // OpenStreetMap standard tiles — CSP-safe (basemaps.cartocdn.com was blocked
      // by img-src on mobile; *.tile.openstreetmap.org is explicitly allowed)
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        crossOrigin: '',
      }).addTo(map);

      // Custom lime marker
      const makeIcon = (active = false) => L.divIcon({
        html: `<div style="
          width: ${active ? 12 : 8}px;
          height: ${active ? 12 : 8}px;
          background: #C8FF00;
          outline: 2px solid #080808;
          box-shadow: 0 0 ${active ? 12 : 6}px #C8FF00;
          transition: all 0.2s;
        "></div>`,
        iconSize: [active ? 12 : 8, active ? 12 : 8],
        iconAnchor: [active ? 6 : 4, active ? 6 : 4],
        className: '',
      });

      pins.forEach((pin) => {
        const marker = L.marker([pin.lat, pin.lng], { icon: makeIcon(singlePin) })
          .addTo(map);

        if (pin.name) {
          marker.bindPopup(
            `<div style="font-family:sans-serif;font-size:12px;font-weight:600;color:#f0f0f0;padding:2px 0">${pin.name}</div>`,
            { closeButton: false, offset: [0, -4] }
          );
        }

        if (pin.id && onPinClick) {
          marker.on('click', () => onPinClick(pin.id!));
        } else if (singlePin && pin.name) {
          marker.openPopup();
        }

        marker.on('mouseover', function(this: L.Marker) {
          this.setIcon(makeIcon(true));
        });
        marker.on('mouseout', function(this: L.Marker) {
          this.setIcon(makeIcon(singlePin));
        });
      });

      mapRef.current = map;

      const refresh = () => {
        if (!mapRef.current) return;
        map.invalidateSize();
        tileLayer.redraw();
      };

      // Belt-and-suspenders refresh schedule:
      // 100ms — catches most desktop/Android cases after CSS settles
      // 500ms — catches slow iOS Safari paint cycles and deferred layout
      const t1 = setTimeout(refresh, 100);
      const t2 = setTimeout(refresh, 500);

      // ResizeObserver — fires on container dimension changes (layout shifts, panel
      // resizing, CityListing switching from sticky to stacked on mobile)
      const ro = new ResizeObserver(refresh);
      ro.observe(containerRef.current!);

      // window resize — iOS address bar show/hide changes window.innerHeight and
      // breaks height:100% chains; a resize event is fired each time
      const onResize = refresh;
      window.addEventListener('resize', onResize);

      // orientationchange — rotate phone: wait for layout to settle then re-check
      const onOrient = () => { setTimeout(refresh, 300); };
      window.addEventListener('orientationchange', onOrient);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any)._cleanup = { ro, t1, t2, onResize, onOrient };
    });

    return () => {
      active = false;
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { ro, t1, t2, onResize, onOrient } = (mapRef.current as any)._cleanup ?? {};
        clearTimeout(t1);
        clearTimeout(t2);
        ro?.disconnect();
        if (onResize) window.removeEventListener('resize', onResize);
        if (onOrient) window.removeEventListener('orientationchange', onOrient);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins.length]);

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
      style={{
        width: '100%',
        height,
        background: '#111',
        position: 'relative',
      }}
    />
  );
}
