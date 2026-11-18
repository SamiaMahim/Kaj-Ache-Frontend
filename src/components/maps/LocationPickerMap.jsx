import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Crosshair, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const DHAKA = [23.8103, 90.4125];

function ClickToPick({ onPick }) {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

function Recenter({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 15));
  }, [point, map]);
  return null;
}

// Optional pin for the job location; `value` is { lat, lng } or null
export default function LocationPickerMap({ value, onChange }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Location is not supported by this browser.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange({ lat: coords.latitude, lng: coords.longitude });
        setLocating(false);
      },
      (geoError) => {
        setError(geoError.code === geoError.PERMISSION_DENIED ? 'Location permission was denied.' : 'Could not read your location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{value ? `Pinned at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : 'Click the map to pin the exact spot (optional). It helps technicians find you and enables live tracking.'}</p>
        <div className="flex gap-2">
          <button type="button" onClick={useCurrentLocation} disabled={locating} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <Crosshair size={14} /> {locating ? 'Locating...' : 'Use my location'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-amber-700">{error}</p>}
      <div className="relative isolate z-0 mt-2 h-64 overflow-hidden rounded-xl ring-1 ring-slate-200">
        <MapContainer center={value ? [value.lat, value.lng] : DHAKA} zoom={12} scrollWheelZoom={false} className="h-full w-full cursor-crosshair">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickToPick onPick={onChange} />
          {value && <CircleMarker center={[value.lat, value.lng]} radius={10} pathOptions={{ color: '#166534', fillColor: '#22c55e', fillOpacity: 0.95 }} />}
          <Recenter point={value} />
        </MapContainer>
      </div>
    </div>
  );
}
