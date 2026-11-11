"use client";

import { useState } from "react";
import { iniciales } from "@/lib/jugadores";

type Props = { nombre: string; fotoUrl: string | null; dorsal: number };

/** Foto del jugador; si no hay URL o la imagen falla, muestra sus iniciales. */
export default function PlayerPhoto({ nombre, fotoUrl, dorsal }: Props) {
  const [fallo, setFallo] = useState(false);
  const mostrarFoto = Boolean(fotoUrl) && !fallo;

  return (
    <div className="pl-detail-photo">
      {mostrarFoto ? (
        // URL externa arbitraria guardada en la base de datos: <img> evita configurar remotePatterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fotoUrl!} alt={`Fotografía de ${nombre}`} onError={() => setFallo(true)} />
      ) : (
        <span className="pl-detail-initials" aria-hidden="true">
          {iniciales(nombre)}
        </span>
      )}

      <span className="pl-detail-dorsal">{String(dorsal).padStart(2, "0")}</span>
    </div>
  );
}
