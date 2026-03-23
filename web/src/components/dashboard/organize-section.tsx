"use client";

import { useState } from "react";
import { AlertCircle, Database, FileJson, Loader2, Sparkles, Upload } from "lucide-react";
import { apiUrl, fetchJson, type OrganizarResposta, type PipelineLocalResponse } from "@/lib/api";

type Props = {
  onSuccess: (data: OrganizarResposta) => void;
  onRefreshResumo: () => void;
  localDatasetName?: string | null;
};

export function OrganizeSection({ onSuccess, onRefreshResumo, localDatasetName }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLocal, setBusyLocal] = useState(false);
  const [err, setErr] = useState("");
  const [localInfo, setLocalInfo] = useState("");

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile?.name.toLowerCase().endsWith(".json")) {
      setFile(droppedFile);
      setErr("");
    } else {
      setErr("So aceitamos arquivo .json.");
    }
  };

  const runUpload = async () => {
    if (!file) return;
    setErr("");
    setLocalInfo("");
    setBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(apiUrl("/api/pipeline"), {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as OrganizarResposta;
      if (!data.ok) throw new Error(data.error ?? "Algo deu errado ao organizar o arquivo.");

      onSuccess(data);
      onRefreshResumo();
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const runLocalPipeline = async () => {
    if (!localDatasetName) {
      setErr("Nenhum arquivo local foi encontrado em src/db. Envie o JSON acima ou coloque um dataset .json nessa pasta.");
      return;
    }

    setErr("");
    setLocalInfo("");
    setBusyLocal(true);

    try {
      const data = await fetchJson<PipelineLocalResponse>(apiUrl("/api/pipeline/local"), { method: "POST" });
      const counts = data.counts;
      setLocalInfo(
        counts
          ? `Arquivo local organizado (${data.sourceFile ?? localDatasetName}): ${counts.pessoas} contato(s), ${counts.clinicas} lugar(es) e ${counts.invalidos} ignorado(s).`
          : "Arquivo local organizado."
      );
      onRefreshResumo();
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyLocal(false);
    }
  };

  return (
    <section id="comecar" className="mb-10 scroll-mt-8">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-6 text-violet-400" aria-hidden />
        <h2 className="text-xl font-semibold tracking-tight text-zinc-50">Passo 1 - Organizar sua lista</h2>
      </div>
      <p className="mb-1 max-w-2xl text-sm leading-relaxed text-zinc-400">
        <strong className="text-zinc-300">O que isso faz?</strong> Voce manda o arquivo que exportou e a API separa
        automaticamente quem parece <em>pessoa</em>, quem parece <em>lugar/empresa</em> e quem ficou estranho demais
        para o envio automatico.
      </p>
      <p className="mb-4 text-xs text-zinc-600">
        O arquivo pode vir como lista na raiz ou dentro de <code className="rounded bg-zinc-800 px-1">data</code>,
        <code className="rounded bg-zinc-800 px-1 ml-1">items</code> ou <code className="rounded bg-zinc-800 px-1 ml-1">results</code>.
      </p>

      <div
        role="button"
        tabIndex={0}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        onKeyDown={(event) => event.key === "Enter" && document.getElementById("json-upload")?.click()}
        onClick={() => document.getElementById("json-upload")?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/30 py-14 transition hover:border-violet-500/50 hover:bg-violet-500/5"
      >
        <Upload className="mb-3 size-10 text-zinc-600" aria-hidden />
        <span className="text-base font-medium text-zinc-200">Arraste o JSON ou clique para escolher</span>
        {file ? (
          <span className="mt-3 flex items-center gap-2 font-mono text-sm text-violet-300">
            <FileJson className="size-4" aria-hidden />
            {file.name}
          </span>
        ) : (
          <span className="mt-2 text-sm text-zinc-500">So precisa ser um .json com sua lista.</span>
        )}
        <input
          id="json-upload"
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0];
            if (selectedFile) {
              setFile(selectedFile);
              setErr("");
            }
          }}
        />
      </div>

      {err ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {err}
        </p>
      ) : null}

      {localInfo ? <p className="mt-3 text-sm text-emerald-300">{localInfo}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!file || busy}
          onClick={() => void runUpload()}
          className="flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 disabled:opacity-40 sm:w-auto"
        >
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
          Organizar meu JSON agora
        </button>

        <button
          type="button"
          disabled={busyLocal || !localDatasetName}
          onClick={() => void runLocalPipeline()}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-40"
        >
          {busyLocal ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Database className="size-4" aria-hidden />}
          Organizar arquivo local do servidor
        </button>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Arquivo local encontrado no servidor:{" "}
        <span className="font-mono text-zinc-400">{localDatasetName ?? "nenhum .json de origem encontrado em src/db"}</span>
      </p>
    </section>
  );
}
