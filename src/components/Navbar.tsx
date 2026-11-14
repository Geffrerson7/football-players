"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cerrarSesion } from "@/app/login/actions";
import { etiquetaRol, type Rol } from "@/lib/roles";
import { ThemeSwitcher } from "./ThemeSwitcher";

const navegacion = [
  { label: "Inicio", href: "/", exacto: true },
  { label: "Jugadores", href: "/jugadores" },
  // Secciones aún sin implementar (H-08): se anuncian, pero no enlazan a un 404.
  { label: "Equipos", href: "/equipos", pendiente: true },
  { label: "Partidos", href: "/partidos", pendiente: true },
];

type Props = {
  /** null = sin sesión (pantalla de inicio de sesión): solo se muestra la marca y el tema. */
  usuario: { nombre: string; rol: Rol } | null;
};

export default function Navbar({ usuario }: Props) {
  const pathname = usePathname();

  return (
    <header className="border-b border-(--pl-line) bg-(--pl-surface) px-5 font-(family-name:--pl-font-body) sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 py-3">
        <Link href={usuario ? "/" : "/login"} className="flex items-center gap-3">
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
          {usuario && (
            <nav aria-label="Navegación principal" className="flex flex-wrap items-center gap-4 sm:gap-6">
              {navegacion.map(({ label, href, exacto, pendiente }) => {
                if (pendiente) {
                  return (
                    <span
                      key={href}
                      className="flex items-center gap-1.5 text-sm font-semibold text-(--pl-muted)"
                    >
                      {label}
                      <span className="rounded border border-dashed border-(--pl-line-strong) px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider">
                        Próximamente
                      </span>
                    </span>
                  );
                }
                const activo = exacto ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={activo ? "page" : undefined}
                    className={`text-sm font-semibold transition-colors ${
                      activo ? "text-(--pl-sash-text)" : "text-(--pl-muted) hover:text-(--pl-ink)"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}

          <ThemeSwitcher />

          {usuario && (
            <form action={cerrarSesion} className="flex items-center gap-3">
              <span className="flex flex-col text-right leading-tight">
                <span className="text-sm font-semibold text-(--pl-ink)">{usuario.nombre}</span>
                <span className="text-xs uppercase tracking-widest text-(--pl-muted)">
                  {etiquetaRol(usuario.rol)}
                </span>
              </span>
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-(--pl-line) px-3 py-2 text-sm font-semibold text-(--pl-ink) transition-colors hover:bg-(--pl-bg)"
              >
                <LogOut size={16} aria-hidden="true" />
                Cerrar sesión
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
