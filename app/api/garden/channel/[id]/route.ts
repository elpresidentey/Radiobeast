import type { NextRequest } from "next/server";

export const revalidate = 3600;

const GARDEN_BASE = "https://radio.garden/api";

function gardenHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    Accept: "application/json",
    Referer: "https://radio.garden/",
    "Accept-Language": "en-US,en;q=0.9",
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !/^[A-Za-z0-9_-]{4,16}$/.test(id)) {
    return Response.json({ channel: null, error: "invalid id" }, { status: 400 });
  }
  try {
    const res = await fetch(`${GARDEN_BASE}/ara/content/channel/${encodeURIComponent(id)}`, {
      headers: gardenHeaders(),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return Response.json({ channel: null, error: `upstream ${res.status}` }, { status: 502 });
    const json = await res.json();
    const d = json?.data;
    if (!d || !d.id) return Response.json({ channel: null }, { status: 404 });
    return Response.json(
      {
        channel: {
          id: d.id,
          title: d.title || "Unknown station",
          place: d.place?.title || "",
          country: d.country?.title || "",
          secure: !!d.secure,
          website: typeof d.website === "string" ? d.website : "",
        },
      },
      { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600" } }
    );
  } catch (e) {
    return Response.json({ channel: null, error: (e as Error).message }, { status: 502 });
  }
}
