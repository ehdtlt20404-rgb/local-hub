'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const PLACE_COLORS: Record<string, string> = {
  pharmacy: '#8b5cf6',
  hospital: '#ef4444',
  convenience: '#f59e0b',
  cafe: '#10b981',
  subway: '#3b82f6',
  bank: '#06b6d4',
}

interface Place { id: number; name: string; lat: number; lng: number; type: string }

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

function MapCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], map.getZoom()) }, [lat, lng])
  return null
}

interface Props {
  lat: number
  lng: number
  address: string
  onMapClick: (lat: number, lng: number) => void
  places?: Place[]
}

export default function Map({ lat, lng, address, onMapClick, places = [] }: Props) {
  return (
    <MapContainer key={`map`} center={[lat, lng]} zoom={15} style={{ width: '100%', height: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* 선택 위치 마커 */}
      <Marker position={[lat, lng]} icon={icon}>
        <Popup><b>{address}</b></Popup>
      </Marker>

      {/* 편의시설 마커 */}
      {places.map(p => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={7}
          pathOptions={{
            color: PLACE_COLORS[p.type] || '#3b82f6',
            fillColor: PLACE_COLORS[p.type] || '#3b82f6',
            fillOpacity: 0.8,
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ fontSize: 13 }}>
              <b>{p.name}</b>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      <MapEvents onMapClick={onMapClick} />
      <MapCenter lat={lat} lng={lng} />
    </MapContainer>
  )
}
