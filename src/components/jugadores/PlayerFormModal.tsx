"use client";

import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Switch,
  TextField,
} from "@heroui/react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { actualizarJugador, crearJugador } from "@/app/jugadores/actions";
import {
  DORSAL_MAX,
  DORSAL_MIN,
  FECHA_MINIMA,
  POSICIONES,
  hoyISO,
  type JugadorDTO,
} from "@/lib/jugadores";
import type { CampoJugador } from "@/lib/validacion";

const claseLabel = "text-sm font-semibold text-(--pl-ink)";
const claseCampo = "flex w-full flex-col gap-1.5";

type Props = {
  /** null = registrar un jugador nuevo; un jugador = editarlo. */
  jugador: JugadorDTO | null;
  isOpen: boolean;
  onOpenChange: (abierto: boolean) => void;
  onGuardado?: (jugador: JugadorDTO, esNuevo: boolean) => void;
};

function validarDorsal(valor: string) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < DORSAL_MIN || numero > DORSAL_MAX) {
    return `Ingresa un dorsal entre ${DORSAL_MIN} y ${DORSAL_MAX}.`;
  }
  return null;
}

function validarFecha(valor: string) {
  if (!valor) return null; // isRequired ya cubre el campo vacío
  if (valor > hoyISO()) return "La fecha de nacimiento no puede ser futura.";
  if (valor < FECHA_MINIMA) return "La fecha de nacimiento no puede ser anterior a 1900.";
  return null;
}

export default function PlayerFormModal({ jugador, isOpen, onOpenChange, onGuardado }: Props) {
  const esNuevo = jugador === null;
  const [guardando, iniciarGuardado] = useTransition();
  const [erroresServidor, setErroresServidor] = useState<Partial<Record<CampoJugador, string>>>(
    {},
  );

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    iniciarGuardado(async () => {
      const resultado = esNuevo
        ? await crearJugador(formData)
        : await actualizarJugador(jugador.id, formData);

      if (!resultado.ok) {
        setErroresServidor(resultado.campos ?? {});
        toast.error(
          esNuevo ? "No se pudo registrar al jugador" : "No se pudo actualizar al jugador",
          { description: resultado.error },
        );
        return;
      }

      toast.success(
        esNuevo ? "Jugador registrado correctamente" : "Jugador actualizado correctamente",
        {
          description: esNuevo
            ? `${resultado.datos.nombre} se agregó al plantel.`
            : `Los datos de ${resultado.datos.nombre} se guardaron.`,
        },
      );
      onGuardado?.(resultado.datos, esNuevo);
      onOpenChange(false);
    });
  }

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={!guardando}
      isKeyboardDismissDisabled={guardando}
      variant="blur"
    >
      <Modal.Container placement="center" scroll="inside">
        <Modal.Dialog className="pl-surface h-auto max-h-[90dvh] overflow-hidden rounded-lg border border-(--pl-line) sm:max-w-md">
          <Modal.CloseTrigger />

          {/* Banda roja: repite el gesto de la portada */}
          <div aria-hidden="true" className="h-2 w-full bg-(--pl-sash)" />

          <Modal.Header className="px-6 pt-6">
            <Modal.Heading className="pl-display text-4xl font-black leading-none">
              {esNuevo ? "Registrar jugador" : "Editar jugador"}
            </Modal.Heading>
            <p className="mt-2 text-sm text-(--pl-muted)">
              {esNuevo
                ? "Completa los cuatro datos para sumarlo al plantel."
                : "Modifica los datos del jugador seleccionado."}
            </p>
          </Modal.Header>

          <Form
            onSubmit={handleSubmit}
            validationErrors={erroresServidor}
            className="flex flex-col"
          >
            <Modal.Body className="flex flex-col gap-5 px-6 py-5">
              <TextField
                isRequired
                name="nombre"
                defaultValue={jugador?.nombre ?? ""}
                maxLength={255}
                className={claseCampo}
              >
                <Label className={claseLabel}>Nombre</Label>
                <Input
                  placeholder="Nombre completo"
                  variant="primary"
                  className="w-full"
                  autoComplete="off"
                />
                <FieldError />
              </TextField>

              <Select
                isRequired
                name="posicion"
                defaultValue={jugador?.posicion ?? undefined}
                placeholder="Selecciona la posición"
                variant="primary"
                className={claseCampo}
              >
                <Label className={claseLabel}>Posición</Label>

                <Select.Trigger className="w-full">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>

                <Select.Popover>
                  <ListBox>
                    {POSICIONES.map((posicion) => (
                      <ListBox.Item key={posicion} id={posicion} textValue={posicion}>
                        {posicion}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>

                <FieldError />
              </Select>

              <TextField
                isRequired
                name="dorsal"
                defaultValue={jugador ? String(jugador.dorsal) : ""}
                validate={validarDorsal}
                className={claseCampo}
              >
                <Label className={claseLabel}>Dorsal</Label>
                <Input
                  placeholder="10"
                  variant="primary"
                  className="w-full"
                  type="number"
                  inputMode="numeric"
                  min={DORSAL_MIN}
                  max={DORSAL_MAX}
                />
                <FieldError />
              </TextField>

              <TextField
                isRequired
                name="fechaNacimiento"
                defaultValue={jugador?.fechaNacimiento ?? ""}
                validate={validarFecha}
                className={claseCampo}
              >
                <Label className={claseLabel}>Fecha de nacimiento</Label>
                <Input
                  type="date"
                  variant="primary"
                  className="w-full"
                  min={FECHA_MINIMA}
                  max={hoyISO()}
                />
                <FieldError />
              </TextField>

              {!esNuevo && (
                <Switch name="activo" defaultSelected={jugador.activo}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    Activo
                  </Switch.Content>
                </Switch>
              )}
            </Modal.Body>

            <Modal.Footer className="gap-3 border-t border-(--pl-line) px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                isDisabled={guardando}
                onPress={() => onOpenChange(false)}
                className="transition-colors duration-200 hover:bg-(--pl-line) hover:text-(--pl-ink)"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                isPending={guardando}
                className="bg-(--pl-sash) font-semibold text-white! transition-colors duration-200 hover:bg-(--pl-sash)/85"
              >
                {guardando
                  ? esNuevo
                    ? "Registrando…"
                    : "Guardando…"
                  : esNuevo
                    ? "Registrar jugador"
                    : "Guardar cambios"}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
