import { NextResponse } from "next/server";

function lon2tile(lon: number, zoom: number) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number) {
  return Math.floor(
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

  const zoom = 16;
  const x = lon2tile(lng, zoom);
  const y = lat2tile(lat, zoom);

  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;

  try {
    const response = await fetch(tileUrl, {
      headers: {
        "User-Agent": "EgresadoApp/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tile: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error fetching map tile:", error);
    return new NextResponse("Error fetching map", { status: 500 });
  }
}
