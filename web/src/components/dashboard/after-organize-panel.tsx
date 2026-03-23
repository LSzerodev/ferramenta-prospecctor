"use client";

import { CheckCircle2, HelpCircle, ListX, Store, Users } from "lucide-react";
import type { OrganizarResposta } from "@/lib/api";

type Props = {
  result: OrganizarResposta;
  onVerIgnorados: () => void;
};

export function AfterOrganizePanel({ result, onVerIgnorados }: Props) {
  const g = result.oQueFoiGerado;
  const c = result.counts;

  if (!g || !c) return null;

  const cards = [
    {
      key: "pessoas",
      icon: Users,
      cor: "border-emerald-500/30 bg-emerald-500/5",
      info: g.pessoas,
      n: c.pessoas,
    },
    {
      key: "clinicas",
      icon: Store,
      cor: "border-zinc-600 bg-zinc-800/40",
      info: g.clinicas,
      n: c.clinicas,
    },
    {
      key: "invalidos",
      icon: ListX,
      cor: "border-amber-500/30 bg-amber-500/5",
      info: g.invalidos,
      n: c.invalidos,
    },
  ] as const;

  return (
    <section
      className="mb-10 scroll-mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
      aria-labelledby="resultado-organizar"
    >
      <div className="mb-4 flex items-center gap-2">
        <CheckCircle2 className="size-6 text-emerald-400" aria-hidden />
        <h2 id="resultado-organizar" className="text-lg font-semibold text-zinc-100">
          Pronto! Seu arquivo virou 3 listas
        </h2>
      </div>
      <p className="mb-6 text-sm text-zinc-400">
        Não precisa entender nomes técnicos. Abaixo está o que cada uma significa no dia a dia.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ key, icon: Icon, cor, info, n }) => (
          <article
            key={key}
            className={`rounded-xl border p-4 ${cor}`}
          >
            <div className="flex items-start justify-between gap-2">
              <Icon className="size-5 shrink-0 text-zinc-400" aria-hidden />
              <span className="text-2xl font-bold tabular-nums text-zinc-100">{n}</span>
            </div>
            <h3 className="mt-3 font-semibold text-zinc-100">{info.tituloSimples}</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">{info.umaFrase}</p>
            <p className="mt-3 flex items-start gap-1 text-[11px] text-zinc-600">
              <HelpCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {info.arquivoInterno}
            </p>
          </article>
        ))}
      </div>

      {result.ignorados && result.ignorados.total > 0 ? (
        <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-100">
            Quer ver linha por linha quem foi ignorado?
          </p>
          <p className="mt-1 text-xs text-amber-200/70">
            {result.ignorados.truncado
              ? `Mostramos até ${result.ignorados.lista.length} aqui na hora; no botão abaixo abre a lista completa (${result.ignorados.total} no total).`
              : `São ${result.ignorados.total} registro(s). Abra a lista para ler o motivo de cada um.`}
          </p>
          <button
            type="button"
            onClick={onVerIgnorados}
            className="mt-3 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-100 ring-1 ring-amber-500/40 transition hover:bg-amber-500/30"
          >
            Abrir lista de ignorados
          </button>
        </div>
      ) : null}
    </section>
  );
}
