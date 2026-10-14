"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useApp } from "./Providers";
import { LogoMark } from "./Logo";

const LINKS = [
  { href: "/map", key: "navMap" },
  { href: "/report", key: "navReport" },
  { href: "/reports", key: "navReports" },
  { href: "/dashboard", key: "navDashboard" },
  { href: "/preferences", key: "navPrefs" },
] as const;

export function SiteHeader() {
  const { t, lang, setLang, status } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[1100] border-b border-navy/10 bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-white">
        {t("skip")}
      </a>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label={`${t("appName")} — ${t("navHome")}`}>
          <LogoMark />
          <span className="whitespace-nowrap text-lg font-bold tracking-tight">
            NammaPath <span className="text-teal-700">AI</span>
          </span>
        </Link>

        <nav aria-label="Main" className={`ml-4 hidden ${lang === "ta" ? "2xl:block" : "xl:block"}`}>
          <ul className="flex items-center gap-1">
            {LINKS.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg px-3 text-[15px] font-bold ${active ? "bg-teal-50 text-teal-700" : "text-navy-700 hover:bg-mute-100"}`}
                  >
                    {t(l.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {status && (
            <span
              className={`chip hidden whitespace-nowrap 2xl:inline-flex ${status.ai.mode === "live" ? "bg-ok-100 text-ok" : "bg-amber-100 text-amber"}`}
              title={status.ai.mode === "live" ? `${status.ai.provider} · ${status.ai.model}` : "No AI key configured"}
            >
              <span aria-hidden="true">{status.ai.mode === "live" ? "●" : "◐"}</span>
              {status.ai.mode === "live" ? t("aiLive") : t("aiDemo")}
            </span>
          )}
          <div role="group" aria-label={t("language")} className="flex rounded-xl border-2 border-navy/15 p-0.5">
            {(["en", "ta"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                lang={l}
                className={`min-h-[40px] min-w-[48px] rounded-lg px-2.5 text-sm font-bold ${lang === l ? "bg-navy text-white" : "text-navy hover:bg-mute-100"}`}
              >
                {l === "en" ? "EN" : "தமிழ்"}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`btn-ghost ${lang === "ta" ? "2xl:hidden" : "xl:hidden"}`}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className={`border-t border-navy/10 bg-white ${lang === "ta" ? "2xl:hidden" : "xl:hidden"}`}>
          <ul className="mx-auto grid max-w-7xl gap-1 px-4 py-3">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} aria-current={pathname === l.href ? "page" : undefined} className="flex min-h-[48px] items-center rounded-lg px-3 font-bold hover:bg-mute-100">
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
