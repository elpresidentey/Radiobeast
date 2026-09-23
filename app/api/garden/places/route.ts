export const revalidate = 86400; // 24h — places list is the full coverage index

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

export async function GET() {
  try {
    const res = await fetch(`${GARDEN_BASE}/ara/content/places`, {
      headers: gardenHeaders(),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return Response.json({ places: [], error: `upstream ${res.status}` }, { status: 502 });
    const json = await res.json();
    const list = json?.data?.list || [];
    const places = list
      .filter((p: { id?: string; title?: string }) => p?.id && p?.title)
      .map((p: { id: string; title: string; country?: string; size?: number }) => ({
        id: p.id,
        title: p.title,
        country: p.country || "",
        size: typeof p.size === "number" ? p.size : 0,
      }))
      .sort((a: { size: number }, b: { size: number }) => b.size - a.size);
    return Response.json(
      { places, total: places.length },
      { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } }
    );
  } catch (e) {
    return Response.json({ places: [], error: (e as Error).message }, { status: 502 });
  }
}
