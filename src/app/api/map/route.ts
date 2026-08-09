import { NextResponse } from "next/server";

function lon2tileFloat(lon: number, zoom: number) {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tileFloat(lat: number, zoom: number) {
  return (
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) /
        Math.PI) /
      2) *
    Math.pow(2, zoom)
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const coords = searchParams.get("coords");
  
  if (!coords) {
    return new NextResponse("Missing coords", { status: 400 });
  }

  const [latStr, lngStr] = coords.split(",");
  let lat = parseFloat(latStr);
  let lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    lat = 13.9945;
    lng = -89.5562;
  }

  // Zoom level 16 by default to match interactive Leaflet map view
  const zoomParam = searchParams.get("zoom");
  const zoom = zoomParam ? Math.max(1, Math.min(18, parseInt(zoomParam, 10))) : 16;
  const tileXFloat = lon2tileFloat(lng, zoom);
  const tileYFloat = lat2tileFloat(lat, zoom);

  const baseX = Math.floor(tileXFloat);
  const baseY = Math.floor(tileYFloat);

  // Fetch 5x3 tiles centered around (baseX, baseY)
  const tilePromises: Promise<{ dx: number; dy: number; dataUrl: string | null }>[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const tx = baseX + dx;
      const ty = baseY + dy;
      const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;

      tilePromises.push(
        fetch(tileUrl, {
          headers: { "User-Agent": "EgresadoApp/1.0" },
        })
          .then(async (res) => {
            if (!res.ok) return { dx, dy, dataUrl: null };
            const buf = await res.arrayBuffer();
            const b64 = Buffer.from(buf).toString("base64");
            return { dx, dy, dataUrl: `data:image/png;base64,${b64}` };
          })
          .catch(() => ({ dx, dy, dataUrl: null }))
      );
    }
  }

  const tileResults = await Promise.all(tilePromises);

  // Target coordinates relative to top-left tile (baseX - 2, baseY - 1)
  const px = (tileXFloat - (baseX - 2)) * 256;
  const py = (tileYFloat - (baseY - 1)) * 256;

  const width = 800;
  const height = 380;

  const minX = px - width / 2;
  const minY = py - height / 2;

  let tilesSvgContent = "";
  tileResults.forEach(({ dx, dy, dataUrl }) => {
    if (dataUrl) {
      const xPos = (dx + 2) * 256;
      const yPos = (dy + 1) * 256;
      tilesSvgContent += `<image href="${dataUrl}" x="${xPos}" y="${yPos}" width="256" height="256"/>\n`;
    }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" preserveAspectRatio="xMidYMid slice">
    <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#e5e3df"/>
    ${tilesSvgContent}

    <!-- Leaflet Top-Left Zoom Controls (+ / -) -->
    <g transform="translate(${minX + 16}, ${minY + 16})">
      <rect x="0" y="0" width="30" height="54" rx="4" fill="#ffffff" stroke="#cccccc" stroke-width="1"/>
      <line x1="0" y1="27" x2="30" y2="27" stroke="#e0e0e0" stroke-width="1"/>
      <text x="15" y="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="bold" fill="#333333" text-anchor="middle" dominant-baseline="middle">+</text>
      <text x="15" y="40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="bold" fill="#333333" text-anchor="middle" dominant-baseline="middle">−</text>
    </g>

    <!-- Leaflet Bottom-Right Attribution -->
    <g transform="translate(${minX + width - 235}, ${minY + height - 22})">
      <rect x="0" y="0" width="225" height="18" rx="2" fill="rgba(255, 255, 255, 0.85)"/>
      <text x="112" y="12" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="9" fill="#0078A8" text-anchor="middle">🇺🇦 Leaflet | © OpenStreetMap contributors</text>
    </g>

    <!-- Leaflet Blue Location Pin Marker -->
    <g transform="translate(${px}, ${py})">
      <!-- Pin Drop Shadow -->
      <ellipse cx="6" cy="2" rx="10" ry="4" fill="rgba(0, 0, 0, 0.3)"/>
      <!-- Leaflet Classic Blue Pin Body -->
      <path d="M 0 0 C -12 -12 -16 -20 -16 -27 A 16 16 0 1 1 16 -27 C 16 -20 12 -12 0 0 Z" fill="#2b82cb" stroke="#1c65a4" stroke-width="1.5" stroke-linejoin="round"/>
      <!-- Inner White Circle -->
      <circle cx="0" cy="-27" r="6" fill="#ffffff"/>
    </g>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
