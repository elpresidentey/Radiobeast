import { NextRequest } from "next/server";

// Parses real-time "Now Playing" title from ICY streams.
// Connects to the stream, reads up to icy-metaint bytes, extracts metadata, closes.

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return Response.json({ title: null }, { headers: { "Access-Control-Allow-Origin": "*" } });

  let parsed: URL;
  try { parsed = new URL(url); } catch { return Response.json({ title: null }, { headers: { "Access-Control-Allow-Origin": "*" } }); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return Response.json({ title: null }, { headers: { "Access-Control-Allow-Origin": "*" } });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "Icy-MetaData": "1" },
    });

    const icyMetaInt = parseInt(res.headers.get("icy-metaint") || "0", 10);
    if (!icyMetaInt || !res.body) {
      clearTimeout(timeout);
      return Response.json({ title: null }, { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let bytesUntilMeta = icyMetaInt;
    let metaLen = 0;
    let metaBuf = "";
    let metaBytesLeft = 0;
    let title: string | null = null;
    let urlOut: string | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      let i = 0;
      while (i < value.length) {
        if (metaBytesLeft > 0) {
          const take = Math.min(metaBytesLeft, value.length - i);
          metaBuf += decoder.decode(value.subarray(i, i + take), { stream: true });
          metaBytesLeft -= take;
          i += take;

          if (metaBytesLeft === 0) {
            // parse StreamTitle='...'
            const m = metaBuf.match(/StreamTitle='([^']*)'/);
            if (m && m[1].trim()) title = m[1].trim();
            const u = metaBuf.match(/StreamUrl='([^']*)'/);
            if (u && u[1].trim()) urlOut = u[1].trim();
            reader.cancel();
            break;
          }
        } else if (metaLen > 0) {
          // reading the length byte
          metaLen = 0;
          metaBytesLeft = value[i] * 16;
          metaBuf = "";
          i++;
        } else {
          // audio data — skip to icy-metaint
          const skip = Math.min(bytesUntilMeta, value.length - i);
          bytesUntilMeta -= skip;
          i += skip;

          if (bytesUntilMeta === 0) {
            metaLen = 1; // next byte is length
            bytesUntilMeta = 0;
          }
        }
      }

      if (title !== null) break;
    }

    clearTimeout(timeout);
    return Response.json({ title, url: urlOut }, { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch {
    clearTimeout(timeout);
    return Response.json({ title: null }, { headers: { "Access-Control-Allow-Origin": "*" } });
  }
}
