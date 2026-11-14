import type { Metadata } from "next";
import LoginForm from "@/components/login/LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="pl-page flex min-h-[75dvh]! items-center justify-center px-5 py-14">
      <section className="w-full max-w-md overflow-hidden rounded-lg border border-(--pl-line) bg-(--pl-surface)">
        {/* Banda de acento: repite el gesto de la portada */}
        <div aria-hidden="true" className="h-2 w-full bg-(--pl-sash)" />

        <div className="px-6 py-8 sm:px-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="pl-kicker">FOOTBALL PLAYERS</span>
            <span className="pl-kicker-line" />
          </div>

          <h1 className="pl-display text-5xl font-black leading-none">
            Iniciar sesión<span className="text-(--pl-sash)">.</span>
          </h1>
          <p className="mb-7 mt-3 text-sm text-(--pl-muted)">
            Accede con tu cuenta para consultar y administrar el plantel.
          </p>

          <LoginForm />
        </div>
      </section>
    </div>
  );
}
