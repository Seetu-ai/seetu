'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Maximize2, Minimize2 } from 'lucide-react';

interface Billboard {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  pricing: {
    pricePerSlot: number;
    slotDurationMins: number;
  };
  status: string;
  isAvailable: boolean;
  queueLength: number;
}

interface BillboardMapProps {
  billboards: Billboard[];
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
}

// Dakar center coordinates
const DEFAULT_CENTER = { lat: 14.6937, lng: -17.4441 };
const DEFAULT_ZOOM = 12;

export function BillboardMap({
  billboards,
  selectedIds = [],
  onSelect,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  height = '400px',
}: BillboardMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Dynamically load Leaflet
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadLeaflet = async () => {
      // Check if already loaded
      if ((window as any).L) {
        setLeafletLoaded(true);
        setIsLoading(false);
        return;
      }

      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        setLeafletLoaded(true);
        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;

    const L = (window as any).L;

    const map = L.map(mapRef.current).setView([center.lat, center.lng], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, center.lat, center.lng, zoom]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded) return;

    const L = (window as any).L;
    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    // Add new markers
    billboards.forEach((billboard) => {
      const isSelected = selectedIds.includes(billboard.id);

      // Custom icon
      const icon = L.divIcon({
        className: 'billboard-marker',
        html: `
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: ${isSelected ? '#7c3aed' : billboard.isAvailable ? '#10b981' : '#f59e0b'};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <rect x="3" y="3" width="18" height="12" rx="2" stroke="white" fill="none" stroke-width="2"/>
              <line x1="12" y1="15" x2="12" y2="21" stroke="white" stroke-width="2"/>
              <line x1="8" y1="21" x2="16" y2="21" stroke="white" stroke-width="2"/>
            </svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([billboard.latitude, billboard.longitude], { icon }).addTo(
        map
      );

      // Popup content
      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="font-weight: 600; margin: 0 0 4px 0;">${billboard.name}</h3>
          <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">
            📍 ${billboard.address}
          </p>
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <span style="
              background: ${billboard.isAvailable ? '#dcfce7' : '#fef3c7'};
              color: ${billboard.isAvailable ? '#166534' : '#92400e'};
              padding: 2px 8px;
              border-radius: 9999px;
              font-size: 11px;
            ">
              ${billboard.isAvailable ? 'Disponible' : 'Maintenance'}
            </span>
            <span style="color: #64748b; font-size: 12px;">
              ${billboard.queueLength} en file
            </span>
          </div>
          <div style="
            font-size: 16px;
            font-weight: 700;
            color: #7c3aed;
          ">
            ${billboard.pricing.pricePerSlot.toLocaleString()} FCFA
          </div>
          ${
            onSelect && billboard.isAvailable
              ? `<button
                  onclick="window.dispatchEvent(new CustomEvent('billboard-select', { detail: '${billboard.id}' }))"
                  style="
                    margin-top: 8px;
                    width: 100%;
                    padding: 8px;
                    background: ${isSelected ? '#f3f4f6' : '#7c3aed'};
                    color: ${isSelected ? '#374151' : 'white'};
                    border: none;
                    border-radius: 6px;
                    font-weight: 500;
                    cursor: pointer;
                  "
                >
                  ${isSelected ? 'Désélectionner' : 'Sélectionner'}
                </button>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });

    // Fit bounds if we have billboards
    if (billboards.length > 0) {
      const bounds = L.latLngBounds(
        billboards.map((b) => [b.latitude, b.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [billboards, selectedIds, leafletLoaded, onSelect]);

  // Handle selection events from popup buttons
  useEffect(() => {
    const handleSelect = (e: CustomEvent<string>) => {
      onSelect?.(e.detail);
    };

    window.addEventListener('billboard-select' as any, handleSelect);
    return () => window.removeEventListener('billboard-select' as any, handleSelect);
  }, [onSelect]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Invalidate map size after state change
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 100);
  };

  return (
    <Card
      className={`overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      }`}
    >
      <div className="relative" style={{ height: isFullscreen ? '100%' : height }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />

        {/* Controls */}
        <div className="absolute top-3 right-3 z-[1000]">
          <Button
            size="icon"
            variant="secondary"
            onClick={toggleFullscreen}
            className="bg-white shadow-md"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white rounded-lg shadow-md p-2 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Maintenance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-600" />
            <span>Sélectionné</span>
          </div>
        </div>

        {/* Selected count */}
        {selectedIds.length > 0 && (
          <div className="absolute top-3 left-3 z-[1000]">
            <Badge className="bg-violet-600">
              {selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
}
