'use client'
import { useEffect } from 'react'
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
  pharmacy: '#8b5cf6', hospital: '#ef4444', convenience: '#f59e0b',
  cafe: '#10b981', subway: '#3b82f6', bank: '#06b6d4',
}
const PLACE_EMOJI: Record<string, string> = { pharmacy: '💊', hospital: '🏥', convenience: '🏪', cafe: '☕', subway: '🚇', bank: '🏦' }
const PLACE_LABEL: Record<string, string> = { pharmacy: '약국', hospital: '병원', convenience: '편의점', cafe: '카페', subway: '지하철', bank: '은행' }
const DEAL_COLOR: Record<string, string> = { '매매': '#34d399', '전세': '#60a5fa', '월세': '#f59e0b' }

interface Place { id: number; name: string; lat: number; lng: number; type: string; address?: string; phone?: string; distance?: string }
export interface PriceMarker { lat: number; lng: number; name: string; price: string; dealType: string }

function createPriceIcon(price: string, dealType: string, highlighted: boolean) {
  const color = DEAL_COLOR[dealType] || '#34d399'
  const bg = dealType === '매매' ? '#064e3b' : dealType === '전세' ? '#1e3a5f' : '#451a03'
  const scale = highlighted ? 1.25 : 1
  const shadow = highlighted
    ? `0 0 0 3px ${color}, 0 4px 20px rgba(0,0,0,0.8)`
    : '0 3px 14px rgba(0,0,0,0.7)'
  const w = highlighted ? 76 : 60
  const h = highlighted ? 46 : 38
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:inline-block;transform:scale(${scale});transform-origin:bottom center">
        <div style="background:${bg};border:${highlighted ? '3px' : '2px'} solid ${color};border-radius:10px;padding:5px 10px;font-size:${highlighted ? '15px' : '13px'};font-weight:900;color:${color};white-space:nowrap;box-shadow:${shadow};letter-spacing:-0.3px;line-height:1">
          <span style="font-size:9px;opacity:0.8;margin-right:2px">${dealType}</span>${price}
        </div>
        <div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:7px solid ${color}"></div>
      </div>`,
    iconAnchor: [w / 2, h],
    iconSize: [w, h],
  })
}

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

function MapCenter({ lat, lng, focusLat, focusLng }: { lat: number; lng: number; focusLat?: number; focusLng?: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], map.getZoom()) }, [lat, lng])
  useEffect(() => { if (focusLat && focusLng) map.setView([focusLat, focusLng], 17) }, [focusLat, focusLng])
  return null
}

interface Props {
  lat: number; lng: number; address: string
  onMapClick: (lat: number, lng: number) => void
  places?: Place[]
  priceMarkers?: PriceMarker[]
  highlightedApt?: string | null
  onPriceMarkerClick?: (name: string) => void
  focusLat?: number
  focusLng?: number
}

export default function Map({ lat, lng, address, onMapClick, places = [], priceMarkers = [], highlightedApt, onPriceMarkerClick, focusLat, focusLng }: Props) {
  return (
    <MapContainer key="map" center={[lat, lng]} zoom={15} style={{ width: '100%', height: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={icon}>
        <Popup><b>{address}</b></Popup>
      </Marker>

      {places.map(p => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={7}
          pathOptions={{ color: PLACE_COLORS[p.type] || '#3b82f6', fillColor: PLACE_COLORS[p.type] || '#3b82f6', fillOpacity: 0.8, weight: 2 }}>
          <Popup>
            <div style={{ fontSize: 12, minWidth: 140 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{PLACE_EMOJI[p.type]} {p.name}</div>
              <div style={{ color: '#666', fontSize: 11, marginBottom: 2 }}>
                {PLACE_LABEL[p.type]}{p.distance ? ` · ${Number(p.distance) >= 1000 ? (Number(p.distance)/1000).toFixed(1)+'km' : p.distance+'m'}` : ''}
              </div>
              {p.address && <div style={{ color: '#888', fontSize: 10, marginBottom: 4 }}>{p.address}</div>}
              {p.phone && <a href={`tel:${p.phone}`} style={{ fontSize: 11, color: '#3b82f6', display: 'block' }}>📞 {p.phone}</a>}
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* 하이라이트 안된 것 먼저, 하이라이트된 것 나중에 (z-index 위로) */}
      {[...priceMarkers.filter(pm => pm.name !== highlightedApt), ...priceMarkers.filter(pm => pm.name === highlightedApt)].map((pm, i) => {
        const isHighlighted = pm.name === highlightedApt
        return (
          <Marker
            key={pm.name + i}
            position={[pm.lat, pm.lng]}
            icon={createPriceIcon(pm.price, pm.dealType, isHighlighted)}
            eventHandlers={{ click: () => onPriceMarkerClick?.(pm.name) }}
            zIndexOffset={isHighlighted ? 1000 : 0}
          >
            <Popup minWidth={160}>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 3 }}>{pm.name}</div>
                <div style={{ color: DEAL_COLOR[pm.dealType] || '#34d399', fontWeight: 700, marginBottom: 8 }}>{pm.dealType} {pm.price}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <a href={`https://search.naver.com/search.naver?query=${encodeURIComponent(pm.name + ' 아파트')}`} target="_blank" rel="noreferrer"
                    style={{ flex: 1, textAlign: 'center', padding: '4px 0', background: '#166534', color: '#4ade80', borderRadius: 5, fontSize: 10, fontWeight: 700, textDecoration: 'none' }}>
                    네이버
                  </a>
                  <a href={`https://www.zigbang.com/home/apt/search?q=${encodeURIComponent(pm.name)}`} target="_blank" rel="noreferrer"
                    style={{ flex: 1, textAlign: 'center', padding: '4px 0', background: '#1e3a5f', color: '#60a5fa', borderRadius: 5, fontSize: 10, fontWeight: 700, textDecoration: 'none' }}>
                    직방
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}

      <MapEvents onMapClick={onMapClick} />
      <MapCenter lat={lat} lng={lng} focusLat={focusLat} focusLng={focusLng} />
    </MapContainer>
  )
}
