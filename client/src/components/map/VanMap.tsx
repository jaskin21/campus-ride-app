import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Stop, Van } from '../../lib/mockData'

const iconDefault = L.Icon.Default.prototype as unknown as Record<string, unknown>
delete iconDefault._getIconUrl
L.Icon.Default.mergeOptions( {
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
} )

const vanIcon = L.divIcon( {
  html: `<div style="background:#facc15;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 12px rgba(250,204,21,0.4);">🚐</div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
} )

const stopIcon = ( count: number ) => L.divIcon( {
  html: `<div style="background:#18181b;border:2px solid ${count > 0 ? '#facc15' : '#3f3f46'};color:${count > 0 ? '#facc15' : '#71717a'};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${count}</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
} )

const userStopIcon = ( count: number ) => L.divIcon( {
  html: `<div style="background:#facc15;border:2px solid #fff;color:#18181b;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;box-shadow:0 0 0 4px rgba(250,204,21,0.3),0 2px 6px rgba(0,0,0,0.4);">${count}</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
} )

// Smooth van marker — updates position directly on Leaflet marker
// without triggering React re-renders
function SmoothVanMarker( { van }: { readonly van: Van } ) {
  const markerRef = useRef<L.Marker>( null )
  const prevLatRef = useRef( van.lat )
  const prevLngRef = useRef( van.lng )

  useEffect( () => {
    const marker = markerRef.current
    if ( !marker ) return

    const newLat = van.lat
    const newLng = van.lng

    // Skip if position hasn't changed
    if (
      Math.abs( newLat - prevLatRef.current ) < 0.000001 &&
      Math.abs( newLng - prevLngRef.current ) < 0.000001
    ) return

    // Update marker position directly — no animation needed
    // because useVanPosition already interpolates smoothly
    marker.setLatLng( [newLat, newLng] )
    prevLatRef.current = newLat
    prevLngRef.current = newLng
  }, [van.lat, van.lng] )

  return (
    <Marker
      ref={markerRef}
      position={[van.lat, van.lng]}
      icon={vanIcon}
    >
      <Popup>
        <div style={{ fontSize: '12px' }}>
          <p style={{ fontWeight: 'bold' }}>{van.driverName}</p>
          <p>Next: {van.nextStop}</p>
          <p>{van.currentPassengers}/{van.capacity} passengers</p>
        </div>
      </Popup>
    </Marker>
  )
}

interface VanMapProps {
  readonly stops: Stop[]
  readonly van: Van
  readonly userStopId?: string
}

export default function VanMap( { stops, van, userStopId }: VanMapProps ) {
  const center: [number, number] = [7.0630, 125.5955]

  return (
    <>
      <style>{`
        .leaflet-top.leaflet-right { top: 80px !important; }
      `}</style>
      <MapContainer
        center={center}
        zoom={16}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="topright" />

        {van.isOnline && <SmoothVanMarker van={van} />}

        {stops.filter( ( s ) => s.active ).map( ( stop ) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={stop.id === userStopId
              ? userStopIcon( stop.queueCount )
              : stopIcon( stop.queueCount )
            }
          >
            <Popup>
              <div style={{ fontSize: '12px' }}>
                <p style={{ fontWeight: 'bold' }}>{stop.name}</p>
                <p>{stop.queueCount} in queue</p>
                {stop.id === userStopId && (
                  <p style={{ color: '#facc15', fontWeight: 'bold' }}>📍 You are here</p>
                )}
              </div>
            </Popup>
          </Marker>
        ) )}
      </MapContainer>
    </>
  )
}