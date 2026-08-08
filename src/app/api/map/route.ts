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

  // Zoom level 14 for wider, zoomed-out city view
  const zoom = 14;
  const tileXFloat = lon2tileFloat(lng, zoom);
  const tileYFloat = lat2tileFloat(lat, zoom);

  const baseX = Math.floor(tileXFloat);
  const baseY = Math.floor(tileYFloat);

  // Fetch 3x3 tiles centered around (baseX, baseY)
  const tilePromises: Promise<{ dx: number; dy: number; dataUrl: string | null }>[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
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

  // Target coordinates relative to top-left tile (baseX - 1, baseY - 1)
  const px = (tileXFloat - (baseX - 1)) * 256;
  const py = (tileYFloat - (baseY - 1)) * 256;

  const width = 640;
  const height = 320;

  const minX = px - width / 2;
  const minY = py - height / 2;

  let tilesSvgContent = "";
  tileResults.forEach(({ dx, dy, dataUrl }) => {
    if (dataUrl) {
      const xPos = (dx + 1) * 256;
      const yPos = (dy + 1) * 256;
      tilesSvgContent += `<image href="${dataUrl}" x="${xPos}" y="${yPos}" width="256" height="256"/>\n`;
    }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">
    <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#e5e3df"/>
    ${tilesSvgContent}
    <!-- Red Pin Location Marker -->
    <g transform="translate(${px}, ${py})">
      <!-- Drop Shadow -->
      <ellipse cx="0" cy="3" rx="10" ry="4" fill="rgba(0,0,0,0.35)"/>
      <!-- Outer Pulsing Glow -->
      <circle cx="0" cy="-34" r="22" fill="#ef4444" opacity="0.2"/>
      <!-- Pin Body -->
      <path d="M 0 0 C -14 -14 -20 -24 -20 -34 A 20 20 0 1 1 20 -34 C 20 -24 14 -14 0 0 Z" fill="#dc2626" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
      <!-- Inner White Ring -->
      <circle cx="0" cy="-34" r="7" fill="#ffffff"/>
      <!-- Inner Red Dot -->
      <circle cx="0" cy="-34" r="3" fill="#990000"/>
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
