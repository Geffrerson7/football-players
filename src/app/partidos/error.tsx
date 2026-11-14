"use client";

import ErrorSeccion from "@/components/torneo/ErrorSeccion";

export default function ErrorPartidos(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorSeccion {...props} seccion="los partidos" />;
}
