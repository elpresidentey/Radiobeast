import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Radiobeast",
  description: "How Radiobeast handles your data: no accounts, no tracking, everything stays on your device.",
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
    <h2 className="text-sm font-bold tracking-wide text-[var(--foreground)]">{title}</h2>
    <div className="mt-2.5 text-sm leading-relaxed text-[var(--muted-foreground)] space-y-2">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors pressable">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
        Back to Radiobeast
      </Link>

      <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-[var(--foreground)]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">Last updated: October 2026</p>

      <div className="mt-8 space-y-4">
        <Card title="The short version">
          <p>
            Radiobeast has no accounts, collects nothing about you, and never sends your data to a server.
            Everything personal to you — favourites, history, settings — lives only in your browser&apos;s local storage on your own device.
          </p>
        </Card>

        <Card title="What stays on your device">
          <p>
            When you use the app, your browser (or the installed PWA/Android app) saves the following locally so the app works without sign-up:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Favourite stations and pinned genres/countries/languages</li>
            <li>Your recently played stations</li>
            <li>Settings: theme, volume, data saver, offline preference</li>
            <li>Sleep timer state</li>
            <li>Any stations you saved for offline listening (stored in your browser&apos;s app cache)</li>
          </ul>
          <p>
            Clearing the app&apos;s site data removes all of it. We cannot recover it, because we never had it.
          </p>
        </Card>

        <Card title="What we don't do">
          <ul className="list-disc pl-5 space-y-1">
            <li>No sign-up, no accounts, no passwords</li>
            <li>No analytics, no tracking pixels, no advertising</li>
            <li>No selling or sharing of data — there is no data to sell</li>
          </ul>
        </Card>

        <Card title="Third-party radio services">
          <p>
            Radiobeast streams stations and station metadata from public third-party services:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><a href="https://www.radio-browser.info" target="_blank" rel="noreferrer" className="text-[var(--foreground)] underline underline-offset-2 hover:no-underline">radio-browser.info</a> — the station directory (you can see and edit your data with them if you contributed stations)</li>
            <li><a href="https://radio.garden" target="_blank" rel="noreferrer" className="text-[var(--foreground)] underline underline-offset-2 hover:no-underline">radio.garden</a> — a supplemental station/coverage source</li>
            <li>The radio stations themselves — each stream comes from the broadcaster&apos;s own servers</li>
          </ul>
          <p>
            When you play a station, your device connects directly to that broadcaster&apos;s stream server, which will see your IP address as any player would. Radiobeast&apos;s own API routes only proxy public directory queries to protect you from having to expose your IP to many different metadata servers.
          </p>
        </Card>

        <Card title="Station artwork & links">
          <p>
            Station logos are loaded directly from the URLs broadcasters publish. Tapping a station&apos;s website link opens that site, which is governed by its own privacy policy.
          </p>
        </Card>

        <Card title="Children">
          <p>Radiobeast is a general-audience radio app and does not knowingly collect any personal information from anyone, including children.</p>
        </Card>

        <Card title="Contact">
          <p>
            Questions about this policy? Open an issue at{" "}
            <a href="https://github.com/elpresidentey/Radiobeast" target="_blank" rel="noreferrer" className="text-[var(--foreground)] underline underline-offset-2 hover:no-underline">github.com/elpresidentey/Radiobeast</a>.
          </p>
        </Card>
      </div>
    </main>
  );
}
