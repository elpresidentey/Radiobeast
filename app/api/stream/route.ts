import { NextRequest } from "next/server";

// Proxy for http radio streams that are blocked by mixed-content on https pages.
// Only allows http/https URLs, streams response directly (no buffering).
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new Response("Missing url", { status: 400 });
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return new Response("Only http/https allowed", { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "Radiobeast/1.0",
        "Icy-MetaData": "1",
        Accept: "*/*",
      },
      // @ts-ignore — Next fetch has next/revalidate but we want no cache
      cache: "no-store",
    });
    if (!upstream.body) return new Response("No stream body", { status: 502 });

    const headers = new Headers();
    const ct = upstream.headers.get("content-type");
    if (ct) headers.set("content-type", ct);
    const icy = upstream.headers.get("icy-metaint");
    if (icy) headers.set("icy-metaint", icy);
    headers.set("cache-control", "no-cache, no-store");
    headers.set("access-control-allow-origin", "*");

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (e) {
    return new Response(`Proxy failed: ${(e as Error).message}`, { status: 502 });
  }
}
