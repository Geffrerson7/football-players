"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { EstadoError } from "@/components/jugadores/EstadosPlantel";

export default function ErrorJugadores({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Error al cargar jugadores:", error);
  }, [error]);

  return (
    <div className="pl-page">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <EstadoError
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
