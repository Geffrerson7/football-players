import { ArrowLeft, House, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <div className="relative flex min-h-[75dvh] items-center justify-center overflow-hidden bg-(--pl-bg) px-5 py-16">
      {/* Decoración de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full border border-(--pl-line) opacity-60 sm:size-96"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full border border-(--pl-line) opacity-60 sm:size-[28rem]"
      />

      <section className="relative mx-auto w-full max-w-2xl text-center">
        <div className="mb-6 flex justify-center">
          <span className="flex size-16 items-center justify-center bg-(--pl-pitch) text-white">
            <Trophy size={30} strokeWidth={1.5} aria-hidden="true" />
          </span>
        </div>

        <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-(--pl-sash)">
          Fuera de juego
        </p>

        <h1 className="font-(family-name:--pl-font-display) text-8xl leading-none tracking-tight text-(--pl-ink) sm:text-9xl">
          404
        </h1>

        <div className="mx-auto my-6 h-1 w-20 bg-(--pl-sash)" />

        <h2 className="mb-4 text-2xl font-black uppercase tracking-wide text-(--pl-ink) sm:text-3xl">
          ¡Esta página no está en el campo!
        </h2>

        <p className="mx-auto mb-8 max-w-md text-base leading-7 text-(--pl-muted)">
          Parece que el árbitro ha detenido la jugada. La página que buscas no existe o ha sido
          movida a otra ubicación.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-(--pl-sash) px-6 py-3 font-bold text-(--pl-on-sash) transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--pl-sash)"
        >
          <House size={18} aria-hidden="true" />
          Volver al inicio
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>

        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-(--pl-muted)">
          Football Players / Football Database
        </p>
      </section>
    </div>
  );
}
