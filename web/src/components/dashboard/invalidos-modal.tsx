"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { apiUrl, fetchJson, type IgnoradoLinha } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function InvalidosModal({ open, onClose }: Props) {
  const [lista, setLista] = useState<IgnoradoLinha[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr("");
    setLoading(true);
    setLista(null);

    fetchJson<{ ok: boolean; lista?: IgnoradoLinha[] }>(apiUrl("/api/ver/lista/ignorados"))
      .then((data) => {
        if (data.lista) setLista(data.lista);
      })
      .catch((error) => setErr(error instanceof Error ? error.message : String(error)))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invalidos-titulo"
      onClick={onClose}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-400" aria-hidden />
            <h2 id="invalidos-titulo" className="text-lg font-semibold text-zinc-100">
              Quem ficou de fora da lista de envio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="border-b border-zinc-800 px-4 py-2 text-sm text-zinc-400">
          Cada linha e alguem que o sistema nao colocou na lista de mensagens automaticas. Leia o motivo em portugues
          simples.
        </p>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {loading ? (
            <div className="flex justify-center py-12 text-zinc-500">
              <Loader2 className="size-8 animate-spin" aria-hidden />
            </div>
          ) : err ? (
            <p className="p-4 text-sm text-red-400">{err}</p>
          ) : lista && lista.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">Ninguem foi ignorado. Tudo certo.</p>
          ) : (
            <ul className="space-y-2">
              {lista?.map((row, index) => (
                <li
                  key={`${row.nameOriginal ?? row.titleOriginal ?? ""}-${index}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-sm"
                >
                  <p className="font-medium text-zinc-200">{row.nameOriginal ?? row.titleOriginal ?? "(sem nome)"}</p>
                  {row.phone ? <p className="mt-0.5 font-mono text-xs text-zinc-500">{row.phone}</p> : null}
                  <p className="mt-2 text-xs leading-relaxed text-amber-200/90">
                    {row.motivoParaVoce ?? "Motivo nao disponivel."}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
