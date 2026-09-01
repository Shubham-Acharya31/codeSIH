import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CheckpointsData, ShipmentPlanDetail } from '../types';

// Fix Leaflet's default icon paths in React/Vite builds
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const hubIcon = L.divIcon({
  className: 'custom-hub-marker',
  html: `<div style="background-color: #0F172A; color: #60A5FA; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold;">H</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const transferIcon = L.divIcon({
  className: 'custom-transfer-marker',
  html: `<div style="background-color: #7C3AED; color: #FFFFFF; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">⇄</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Helper component to auto-fit map view to bounds
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10, animate: true });
    }
  }, [map, bounds]);
  return null;
}

interface RouteMapProps {
  checkpointsData: CheckpointsData;
  activeShipmentDetail?: ShipmentPlanDetail | null;
  height?: string;
  isOverview?: boolean;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  checkpointsData,
  activeShipmentDetail,
  height = '480px',
  isOverview = false
}) => {
  const checkpoints = checkpointsData.checkpoints || {};

  // Trunk edges across the 5 hubs
  const trunkLines = useMemo(() => [
    { from: "Indranagar Junction", to: "Himkot" },
    { from: "Indranagar Junction", to: "Suryapatan" },
    { from: "Indranagar Junction", to: "Chandanpalli" },
    { from: "Indranagar Junction", to: "Meghdoot" },
    { from: "Suryapatan", to: "Chandanpalli" },
  ], []);

  // Compute map bounds dynamically from active shipment or all geocoded checkpoints
  const mapBounds = useMemo(() => {
    if (activeShipmentDetail && activeShipmentDetail.geometry && activeShipmentDetail.geometry.length > 0) {
      const coords = activeShipmentDetail.geometry.map(([lat, lon]) => [lat, lon] as [number, number]);
      return L.latLngBounds(coords);
    }
    const allCoords = Object.values(checkpoints).map((c) => [c.lat, c.lon] as [number, number]);
    if (allCoords.length > 0) {
      return L.latLngBounds(allCoords);
    }
    return L.latLngBounds([
      [12.0, 70.0],
      [30.5, 89.0]
    ]);
  }, [activeShipmentDetail, checkpoints]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-2xs" style={{ height }}>
      <MapContainer
        bounds={mapBounds}
        style={{ height: '100%', width: '100%', backgroundColor: '#F1F5F9' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={mapBounds} />

        {/* 1. Overview Trunk Rail Lines */}
        {isOverview && trunkLines.map((edge, idx) => {
          const p1 = checkpoints[edge.from];
          const p2 = checkpoints[edge.to];
          if (!p1 || !p2) return null;
          return (
            <Polyline
              key={`trunk-${idx}`}
              positions={[[p1.lat, p1.lon], [p2.lat, p2.lon]]}
              pathOptions={{ color: '#4F46E5', weight: 3, dashArray: '6, 8', opacity: 0.7 }}
            />
          );
        })}

        {/* 2. Active Shipment Leg Polyline */}
        {!isOverview && activeShipmentDetail && activeShipmentDetail.geometry && activeShipmentDetail.geometry.length > 0 && (
          <Polyline
            positions={activeShipmentDetail.geometry}
            pathOptions={{
              color: activeShipmentDetail.selected_mode === 'rail' ? '#7C3AED' : '#2563EB',
              weight: 5,
              opacity: 0.85,
              dashArray: activeShipmentDetail.selected_mode === 'rail' ? '8, 6' : undefined
            }}
          />
        )}

        {/* 3. Checkpoint Markers */}
        {Object.entries(checkpoints).map(([cityName, info]) => {
          const isHub = info.type === 'hub';
          const isTransfer = activeShipmentDetail?.transfer_hubs?.includes(cityName);
          
          // Only show satellites if they are part of overview or active route
          if (!isHub && !isOverview && activeShipmentDetail) {
            const isOriginOrDest = activeShipmentDetail.route_description.includes(cityName);
            if (!isOriginOrDest && !isTransfer) return null;
          }

          let iconToUse: L.Icon<any> | L.DivIcon = defaultIcon;
          if (isTransfer) iconToUse = transferIcon;
          else if (isHub) iconToUse = hubIcon;

          return (
            <Marker
              key={cityName}
              position={[info.lat, info.lon]}
              icon={iconToUse as any}
            >
              <Popup>
                <div className="text-xs p-1">
                  <strong className="text-sm block text-slate-900">{cityName}</strong>
                  <span className={`inline-block px-1.5 py-0.5 mt-1 rounded text-[10px] font-semibold ${
                    isHub ? 'bg-slate-900 text-blue-300' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {isHub ? 'Multimodal Hub (Road + Rail)' : `Road Satellite (Near: ${info.nearest_hub})`}
                  </span>
                  {isTransfer && (
                    <p className="mt-1 text-purple-700 font-semibold">
                      ⇄ Multimodal Transfer Hub
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-lg border border-slate-200 text-xs shadow-md z-[1000] flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-900 text-[9px] text-blue-300 flex items-center justify-center font-bold">H</span>
          <span className="text-slate-700 font-medium">Multimodal Hub ({checkpointsData.hubs?.length || 5} total)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-0.5 bg-blue-600"></span>
          <span className="text-slate-700 font-medium">Road Feeder / Direct</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 border-b-2 border-dashed border-indigo-600"></span>
          <span className="text-slate-700 font-medium">Trunk Freight Rail Edge</span>
        </div>
      </div>
    </div>
  );
};
