"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { EstadoError } from "@/components/jugadores/EstadosPlantel";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Qué no se pudo cargar: «los equipos», «los partidos». */
  seccion: string;
};

/** Contenido común de los `error.tsx` de Equipos y Partidos. */
export default function ErrorSeccion({ error, reset, seccion }: Props) {
  const router = useRouter();

  useEffect(() => {
    console.error(`Error al cargar ${seccion}:`, error);
  }, [error, seccion]);

  return (
    <div className="pl-page">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <EstadoError
          titulo={`No pudimos cargar ${seccion}.`}
          mensaje="No fue posible obtener los datos de la base de datos. Revisa la conexión y vuelve a intentarlo."
          onReintentar={() =>
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
        />
      </div>
    </div>
  );
}
