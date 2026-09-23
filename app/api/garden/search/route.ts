import type { NextRequest } from "next/server";

export const revalidate = 300; // 5min — search is dynamic

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

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  if (!q) return Response.json({ channels: [], places: [] });
  try {
    const res = await fetch(`${GARDEN_BASE}/search?q=${encodeURIComponent(q)}`, {
      headers: gardenHeaders(),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return Response.json({ channels: [], places: [], error: `upstream ${res.status}` }, { status: 502 });
    const json = await res.json();
    const hits = json?.hits?.hits || [];
    const channels: { id: string; title: string; place: string; country: string; subtitle?: string; secure?: boolean }[] = [];
    const places: { id: string; title: string; country: string }[] = [];
    const seenC = new Set<string>();
    const seenP = new Set<string>();

    for (const h of hits) {
      const src = h?._source;
      if (!src?.page) continue;
      if (src.type === "channel" || src.page?.type === "channel") {
        const url: string = src.page.url || "";
        const m = url.match(/\/listen\/[^/]+\/([^/?#]+)/);
        const cid = m ? m[1] : null;
        if (!cid || seenC.has(cid)) continue;
        seenC.add(cid);
        channels.push({
          id: cid,
          title: src.title || src.page.title || "Unknown station",
          place: src.page.place?.title || "",
          country: src.page.country?.title || src.subtitle || "",
          subtitle: src.page.subtitle || "",
          secure: !!src.page.secure,
        });
      } else if (src.type === "place" || src.type === "country") {
        const url: string = src.page?.url || src.url || "";
        const m = url.match(/\/visit\/[^/]+\/([^/?#]+)/);
        const pid = m ? m[1] : null;
        const title: string = src.title || "";
        if (!pid || !title || seenP.has(pid)) continue;
        seenP.add(pid);
        places.push({ id: pid, title, country: src.subtitle || "" });
      }
      if (channels.length >= 30 && places.length >= 10) break;
    }

    return Response.json(
      { channels, places },
      { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300" } }
    );
  } catch (e) {
    return Response.json({ channels: [], places: [], error: (e as Error).message }, { status: 502 });
  }
}
