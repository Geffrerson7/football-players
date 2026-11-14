import { CargandoPlantel } from "@/components/jugadores/EstadosPlantel";

export default function CargandoPartidos() {
  return (
    <div className="pl-page">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <CargandoPlantel titulo="Partidos" mensaje="Repasando los resultados..." />
      </div>
    </div>
  );
}
