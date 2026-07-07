"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function LocationMarker({ position, setPosition }: { position: [number, number] | null, setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function MapSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (value) {
      try {
        const coords = value.split(",").map(Number);
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          setPosition([coords[0], coords[1]]);
        }
      } catch (e) {
        // Ignorar si el valor no era coordenadas válidas
      }
    }
  }, [value]);

  const handleSetPosition = (pos: [number, number]) => {
    setPosition(pos);
    onChange(`${pos[0]},${pos[1]}`);
  };

  if (!isMounted) return <div className="h-[250px] bg-slate-100 animate-pulse rounded-lg border border-slate-200 flex items-center justify-center text-sm text-slate-400">Cargando mapa...</div>;

  return (
    <div className="h-[250px] w-full rounded-lg overflow-hidden border border-gray-300 relative z-0">
      <MapContainer
        center={position || [13.9782, -89.5668]} // Default a Santa Ana, El Salvador (UNICAES)
        zoom={position ? 15 : 12}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={handleSetPosition} />
      </MapContainer>
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md shadow text-xs font-bold text-gray-700 z-[400] border border-gray-200">
        Haz clic en el mapa para {position ? "mover" : "colocar"} el marcador
      </div>
    </div>
  );
}
