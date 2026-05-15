import { useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Stop } from '../../features/stops/stopsApi'
import type { Van } from '../../lib/mockData'

const iconDefault = L.Icon.Default.prototype as unknown as Record<string, unknown>
delete iconDefault._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const vanIcon = L.divIcon({
  html: `<div style="background:#facc15;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 12px rgba(250,204,21,0.4);">🚐</div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

const stopIcon = (active: boolean, isDragging: boolean) => L.divIcon({
  html: `<div style="
    background:${isDragging ? '#facc15' : '#18181b'};
    border:2px solid ${isDragging ? '#fff' : active ? '#facc15' : '#3f3f46'};
    color:${isDragging ? '#000' : active ? '#facc15' : '#71717a'};
    width:38px;height:38px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:16px;
    box-shadow:${isDragging ? '0 8px 24px rgba(250,204,21,0.6)' : '0 2px 6px rgba(0,0,0,0.5)'};
    cursor:grab;
    transition:all 0.15s ease;
  ">📍</div>`,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

interface DraggableMarkerProps {
  readonly stop: Stop
  readonly onDrop: (lat: number, lng: number) => void
  readonly onToggle: (active: boolean) => void
}

function DraggableMarker({ stop, onDrop, onToggle }: DraggableMarkerProps) {
  const markerRef = useRef<L.Marker>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [localActive, setLocalActive] = useState(stop.active)

  const handleToggle = async () => {
    setIsToggling(true)
    const newActive = !localActive
    setLocalActive(newActive)
    await onToggle(newActive)
    setIsToggling(false)
  }

  return (
    <Marker
      ref={markerRef}
      position={[stop.lat, stop.lng]}
      icon={stopIcon(localActive, isDragging)}
      draggable={true}
      eventHandlers={{
        dragstart: () => setIsDragging(true),
        dragend: () => {
          setIsDragging(false)
          const marker = markerRef.current
          if (marker) {
            const { lat, lng } = marker.getLatLng()
            onDrop(lat, lng)
          }
        },
      }}
    >
      <Popup>
        <div style={{
          minWidth: '160px',
          padding: '8px',
          background: '#18181b',
          borderRadius: '12px',
          color: '#fff',
        }}>
          {/* Stop name */}
          <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#fff' }}>
            {stop.name}
          </p>

          {/* Status badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: localActive ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
            color: localActive ? '#4ade80' : '#f87171',
            borderRadius: '99px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: '600',
            marginBottom: '8px',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: localActive ? '#4ade80' : '#f87171',
              display: 'inline-block',
            }} />
            {localActive ? 'Active' : 'Inactive'}
          </div>

          <p style={{ color: '#71717a', fontSize: '11px', marginBottom: '10px' }}>
            🖱 Drag pin to reposition
          </p>

          {/* Toggle button */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: isToggling ? 'wait' : 'pointer',
              border: 'none',
              background: localActive ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)',
              color: localActive ? '#f87171' : '#4ade80',
              opacity: isToggling ? 0.7 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {isToggling ? '...' : localActive ? '⛔ Deactivate Stop' : '✅ Activate Stop'}
          </button>
        </div>
      </Popup>
    </Marker>
  )
}

interface AdminMapProps {
  readonly stops: Stop[]
  readonly van: Van
  readonly onStopDrop: (stopId: string, lat: number, lng: number) => void
  readonly onToggleStop: (stopId: string, active: boolean) => void
}

export default function AdminMap({ stops, van, onStopDrop, onToggleStop }: AdminMapProps) {
  const center: [number, number] = [7.0630, 125.5955]

  return (
    <>
      <style>{`
        .leaflet-top.leaflet-right { top: 80px !important; }
        .leaflet-marker-icon { cursor: grab !important; }
        .leaflet-marker-icon:active { cursor: grabbing !important; }
        .leaflet-popup-content-wrapper {
          background: #18181b !important;
          border: 1px solid #3f3f46 !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.5) !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-popup-tip-container { display: none !important; }
        .leaflet-popup-close-button {
          color: #71717a !important;
          font-size: 16px !important;
          top: 8px !important;
          right: 8px !important;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={17}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution="&copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <ZoomControl position="topright" />

        {van.isOnline && (
          <Marker position={[van.lat, van.lng]} icon={vanIcon}>
            <Popup>
              <div style={{
                padding: '8px',
                background: '#18181b',
                borderRadius: '12px',
                color: '#fff',
                minWidth: '140px',
              }}>
                <p style={{ fontWeight: 'bold', marginBottom: '4px', color: '#facc15' }}>
                  🚐 {van.driverName}
                </p>
                <p style={{ fontSize: '12px', color: '#a1a1aa' }}>Next: {van.nextStop}</p>
                <p style={{ fontSize: '12px', color: '#a1a1aa' }}>
                  {van.currentPassengers}/{van.capacity} passengers
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {stops.map((stop) => (
          <DraggableMarker
            key={stop.id}
            stop={stop}
            onDrop={(lat, lng) => onStopDrop(stop.id, lat, lng)}
            onToggle={(active) => onToggleStop(stop.id, active)}
          />
        ))}
      </MapContainer>
    </>
  )
}