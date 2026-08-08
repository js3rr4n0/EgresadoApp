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
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return new NextResponse("Invalid coords", { status: 400 });
  }

  // Zoom level 15 for clear city street grid, neighborhood labels, and prominent location pin
  const zoomParam = searchParams.get("zoom");
  const zoom = zoomParam ? Math.max(1, Math.min(18, parseInt(zoomParam, 10))) : 15;
  const tileXFloat = lon2tileFloat(lng, zoom);
  const tileYFloat = lat2tileFloat(lat, zoom);

  const baseX = Math.floor(tileXFloat);
  const baseY = Math.floor(tileYFloat);

  // Fetch 5x3 tiles centered around (baseX, baseY) for wide horizontal city view
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
  const height = 360;

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
    <!-- Red Location Dot & Pin Marker -->
    <g transform="translate(${px}, ${py})">
      <!-- Outer Glowing Pulse Rings -->
      <circle cx="0" cy="0" r="28" fill="#ef4444" opacity="0.18"/>
      <circle cx="0" cy="0" r="18" fill="#ef4444" opacity="0.3"/>
      <circle cx="0" cy="0" r="10" fill="#dc2626" opacity="0.5"/>
      <!-- Bright Central Red Dot -->
      <circle cx="0" cy="0" r="7" fill="#dc2626" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="0" cy="0" r="2.5" fill="#ffffff"/>
      <!-- Red Pin Body above the dot -->
      <g transform="translate(0, -6)">
        <ellipse cx="0" cy="0" rx="8" ry="3" fill="rgba(0,0,0,0.35)"/>
        <path d="M 0 0 C -12 -12 -18 -20 -18 -28 A 18 18 0 1 1 18 -28 C 18 -20 12 -12 0 0 Z" fill="#dc2626" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="0" cy="-28" r="6" fill="#ffffff"/>
        <circle cx="0" cy="-28" r="2.5" fill="#990000"/>
      </g>
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
