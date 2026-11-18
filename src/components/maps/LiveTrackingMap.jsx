import { useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { Navigation, Radio, RadioTower } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { fetchTechnicianLocation, updateTechnicianLocation } from '../../services/api';

const DHAKA = [23.8103, 90.4125];
const POLL_MS = 5000;

const toLatLng = (point) => (Number.isFinite(point?.lat) && Number.isFinite(point?.lng) ? [point.lat, point.lng] : null);

// Keeps both markers in view as positions change
function FitToPoints({ points }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], Math.max(map.getZoom(), 14));
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

const timeAgo = (value) => {
  if (!value) return '';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
};

/**
 * Live technician location for an assigned booking.
 * - mode="customer": polls the technician's last shared position.
 * - mode="technician": shares the browser's GPS position (throttled) while sharing is on.
 * `destination` is the job location ({ lat, lng }) when the customer pinned it.
 */
export default function LiveTrackingMap({ gigId, mode, destination, address }) {
  const [technician, setTechnician] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const lastSentRef = useRef(0);

  // Customer: poll the latest technician position
  useEffect(() => {
    if (mode !== 'customer') return undefined;
    let active = true;
    const load = async () => {
      try {
        const location = await fetchTechnicianLocation(gigId);
        if (active) { setTechnician(location); setError(''); }
      } catch (loadError) {
        if (active) setError(loadError.message);
      }
    };
    load();
    const intervalId = window.setInterval(load, POLL_MS);
    return () => { active = false; window.clearInterval(intervalId); };
  }, [gigId, mode]);

  // Technician: watch GPS and push at most once per POLL_MS
  useEffect(() => {
    if (mode !== 'technician' || !sharing || !navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const point = { lat: coords.latitude, lng: coords.longitude, updatedAt: new Date().toISOString() };
        setTechnician(point);
        if (Date.now() - lastSentRef.current < POLL_MS) return;
        lastSentRef.current = Date.now();
        try {
          await updateTechnicianLocation(gigId, point);
          setError('');
        } catch (sendError) {
          setError(sendError.message);
        }
      },
      (geoError) => {
        setError(geoError.code === geoError.PERMISSION_DENIED ? 'Location permission was denied.' : 'Could not read your location.');
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [gigId, mode, sharing]);

  const techPoint = toLatLng(technician);
  const destPoint = toLatLng(destination);
  const points = [techPoint, destPoint].filter(Boolean);
  const directionsUrl = destPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${destPoint.join(',')}`
    : address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : '';

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-green-600">Live tracking</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">{mode === 'customer' ? 'Where is my technician?' : 'Share your location'}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'customer'
              ? technician ? `Last updated ${timeAgo(technician.updatedAt)}` : "The technician hasn't shared their location yet."
              : sharing ? 'Sharing live with the customer while this page is open.' : 'Let the customer see you on the way.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === 'technician' && (
            <button
              type="button"
              onClick={() => {
                if (!sharing && !navigator.geolocation) {
                  setError('Location is not supported by this browser.');
                  return;
                }
                setSharing((value) => !value);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${sharing ? 'border border-rose-200 text-rose-700 hover:bg-rose-50' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              {sharing ? <><RadioTower size={16} /> Stop sharing</> : <><Radio size={16} /> Start sharing</>}
            </button>
          )}
          {mode === 'technician' && directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <Navigation size={16} /> Directions
            </a>
          )}
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">{error}</p>}

      <div className="relative isolate z-0 mt-5 h-72 overflow-hidden rounded-2xl ring-1 ring-slate-200 sm:h-96">
        <MapContainer center={points[0] || DHAKA} zoom={13} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {destPoint && (
            <CircleMarker center={destPoint} radius={10} pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.9 }}>
              <Tooltip direction="top" offset={[0, -8]}>Job location</Tooltip>
            </CircleMarker>
          )}
          {techPoint && (
            <CircleMarker center={techPoint} radius={11} pathOptions={{ color: '#166534', fillColor: '#22c55e', fillOpacity: 0.95 }}>
              <Tooltip direction="top" offset={[0, -8]} permanent>{mode === 'customer' ? 'Technician' : 'You'}</Tooltip>
            </CircleMarker>
          )}
          <FitToPoints points={points} />
        </MapContainer>
      </div>
    </section>
  );
}
