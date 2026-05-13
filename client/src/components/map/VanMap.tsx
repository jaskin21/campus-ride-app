import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Stop, Van } from "../../lib/mockData";

// Fix Leaflet default icon bug with Vite
const iconDefault = L.Icon.Default.prototype as unknown as Record<
  string,
  unknown
>;
delete iconDefault._getIconUrl;
delete iconDefault._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const vanIcon = L.divIcon({
  html: `<div style="background:#facc15;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🚐</div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const stopIcon = (count: number) =>
  L.divIcon({
    html: `<div style="background:#18181b;border:2px solid ${count > 0 ? "#facc15" : "#3f3f46"};color:${count > 0 ? "#facc15" : "#71717a"};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${count}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

interface VanMapProps {
  readonly stops: Stop[];
  readonly van: Van;
  readonly userStopId?: string;
}

export default function VanMap({ stops, van, userStopId }: VanMapProps) {
  const center: [number, number] = [7.063, 125.5955];

  return (
    <>
      <style>{`
        .leaflet-top.leaflet-right {
            top: 80px !important;
        }
        `}</style>
      <MapContainer
        center={center}
        zoom={16}
        zoomControl={false}
        style={{ width: "100%", height: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="topright" />

        {/* Van marker */}
        {van.isOnline && (
          <Marker position={[van.lat, van.lng]} icon={vanIcon}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{van.driverName}</p>
                <p>Next: {van.nextStop}</p>
                <p>
                  {van.currentPassengers}/{van.capacity} passengers
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Stop markers */}
        {stops
          .filter((s) => s.active)
          .map((stop) => (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lng]}
              icon={stopIcon(stop.queueCount)}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold">{stop.name}</p>
                  <p>{stop.queueCount} in queue</p>
                  {stop.id === userStopId && (
                    <p className="text-yellow-500">📍 Your stop</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </>
  );
}
