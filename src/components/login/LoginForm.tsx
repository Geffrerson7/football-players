"use client";

import { Button, Input, Label, TextField } from "@heroui/react";
import { useActionState } from "react";
import { entrarComoDemo, iniciarSesion } from "@/app/login/actions";

const claseLabel = "text-sm font-semibold text-(--pl-ink)";
const claseCampo = "flex w-full flex-col gap-1.5";

export default function LoginForm() {
  const [estado, enviar, iniciando] = useActionState(iniciarSesion, null);
  const [estadoDemo, entrarDemo, entrandoDemo] = useActionState(entrarComoDemo, null);

  const ocupado = iniciando || entrandoDemo;
  // Solo se muestra el error del último intento, sea cual sea el formulario.
  const error = (entrandoDemo || iniciando ? null : (estadoDemo ?? estado))?.error;

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-(--pl-danger-fill)/40 bg-(--pl-danger-fill)/10 px-3 py-2 text-sm text-(--pl-danger-text)"
        >
          {error}
        </p>
      )}

      <form action={enviar} className="flex flex-col gap-5">
        <TextField isRequired name="email" type="email" className={claseCampo}>
          <Label className={claseLabel}>Correo electrónico</Label>
          <Input
            placeholder="tu@correo.com"
            variant="primary"
            className="w-full"
            autoComplete="username"
          />
        </TextField>

        <TextField isRequired name="password" type="password" className={claseCampo}>
          <Label className={claseLabel}>Contraseña</Label>
          <Input variant="primary" className="w-full" autoComplete="current-password" />
        </TextField>

        <Button
          type="submit"
          isPending={iniciando}
          isDisabled={ocupado}
          className="bg-(--pl-sash-fill) font-semibold text-white! transition-colors duration-200 hover:bg-(--pl-sash-fill)/85"
        >
          {iniciando ? "Entrando…" : "Iniciar sesión"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-(--pl-muted)">
        <span aria-hidden="true" className="h-px flex-1 bg-(--pl-line)" />
        o
        <span aria-hidden="true" className="h-px flex-1 bg-(--pl-line)" />
      </div>

      <form action={entrarDemo} className="flex flex-col gap-2">
        <Button
          type="submit"
          variant="outline"
          isPending={entrandoDemo}
          isDisabled={ocupado}
          className="border-(--pl-line-strong) font-semibold text-(--pl-ink)"
        >
          {entrandoDemo ? "Entrando…" : "Entrar como demo"}
        </Button>
        <p className="text-center text-xs text-(--pl-muted)">
          El usuario demo puede ver todo, pero no modificar datos.
        </p>
      </form>
    </div>
  );
}
