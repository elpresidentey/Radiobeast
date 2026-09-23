"use client";

// Renders an executable script on the server (runs during HTML parse) but a
// non-executable data block on the client, so React never mounts an inline
// script during hydration. suppressHydrationWarning covers the type mismatch.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
