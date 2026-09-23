import type { NextRequest } from "next/server";

export const revalidate = 3600; // 1h — place pages change slowly

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

type GardenChannel = {
  id: string;
  title: string;
  place: string;
  country: string;
  subtitle?: string;
  secure?: boolean;
  website?: string;
};

function channelIdFromHref(href: string): string | null {
  const m = href.match(/\/listen\/[^/]+\/([^/?#]+)/);
  return m ? m[1] : null;
}

// NOTE: GPS ignored on purpose — "Nearby ..." lists are distance-based and
// skipped so coverage comes from the full places index, not location.
function isNearbyList(title: string): boolean {
  return title.toLowerCase().startsWith("nearby");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !/^[A-Za-z0-9_-]{4,16}$/.test(id)) {
    return Response.json({ channels: [], error: "invalid id" }, { status: 400 });
  }
  try {
    const res = await fetch(`${GARDEN_BASE}/ara/content/page/${encodeURIComponent(id)}`, {
      headers: gardenHeaders(),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return Response.json({ channels: [], error: `upstream ${res.status}` }, { status: 502 });
    const json = await res.json();
    const content = json?.data?.content || [];
    const channels: GardenChannel[] = [];
    const seen = new Set<string>();

    for (const list of content) {
      if (!list || list.itemsType !== "channel" || !Array.isArray(list.items)) continue;
      if (typeof list.title === "string" && isNearbyList(list.title)) continue;
      for (const item of list.items) {
        const page = item?.page;
        if (!page || page.type !== "channel" || typeof page.url !== "string") continue;
        const cid = channelIdFromHref(page.url);
        if (!cid || seen.has(cid)) continue;
        seen.add(cid);
        channels.push({
          id: cid,
          title: page.title || "Unknown station",
          place: page.place?.title || "",
          country: page.country?.title || "",
          subtitle: page.subtitle || "",
          secure: !!page.secure,
        });
        if (channels.length >= 60) break;
      }
      if (channels.length >= 60) break;
    }

    return Response.json(
      { channels, count: channels.length },
      { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600" } }
    );
  } catch (e) {
    return Response.json({ channels: [], error: (e as Error).message }, { status: 502 });
  }
}
