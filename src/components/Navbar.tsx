"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "./ThemeSwitcher";

const navegacion = [
  { label: "Inicio", href: "/", exacto: true },
  { label: "Jugadores", href: "/jugadores" },
  { label: "Equipos", href: "/equipos" },
  { label: "Partidos", href: "/partidos" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-(--pl-line) bg-(--pl-surface) px-5 font-(family-name:--pl-font-body) sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center bg-(--pl-pitch) font-black text-white">
            FP
          </span>

          <span className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-(--pl-ink)">
              FOOTBALL PLAYERS
            </span>
            <span className="text-xs tracking-widest text-(--pl-muted)">FOOTBALL DATABASE</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <nav aria-label="Navegación principal" className="flex flex-wrap items-center gap-4 sm:gap-6">
            {navegacion.map(({ label, href, exacto }) => {
              const activo = exacto ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={activo ? "page" : undefined}
                  className={`text-sm font-semibold transition-colors ${
                    activo ? "text-(--pl-sash)" : "text-(--pl-muted) hover:text-(--pl-ink)"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
