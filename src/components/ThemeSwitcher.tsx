"use client";

import { Button } from "@heroui/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const opciones = [
  { valor: "light", etiqueta: "Claro", aria: "Tema claro", Icono: Sun },
  { valor: "dark", etiqueta: "Oscuro", aria: "Tema oscuro", Icono: Moon },
  { valor: "system", etiqueta: "Sistema", aria: "Tema del sistema", Icono: Monitor },
] as const;

const suscribirse = () => () => {};

/** true solo en el cliente: durante el SSR el tema elegido aún no se conoce. */
function useMontado() {
  return useSyncExternalStore(
    suscribirse,
    () => true,
    () => false,
  );
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const montado = useMontado();

  return (
    <div
      role="group"
      aria-label="Seleccionar tema"
      className="inline-flex items-center gap-1 rounded-xl border border-(--pl-line) bg-(--pl-surface) p-1"
    >
      {opciones.map(({ valor, etiqueta, aria, Icono }) => {
        const activo = montado && theme === valor;
        return (
          <Button
            key={valor}
            size="sm"
            variant="ghost"
            aria-label={aria}
            aria-pressed={activo}
            onPress={() => setTheme(valor)}
            className={`gap-2 rounded-lg px-3 py-2 ${
              activo ? "bg-(--pl-sash) text-white" : "bg-transparent text-(--pl-ink) hover:bg-(--pl-bg)"
            }`}
          >
            <Icono size={20} aria-hidden="true" />
            <span className="hidden sm:inline">{etiqueta}</span>
          </Button>
        );
      })}
    </div>
  );
}
