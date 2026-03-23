"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  MessageCircle,
  Play,
  RefreshCw,
  Save,
  Square,
  Terminal,
} from "lucide-react";
import {
  apiUrl,
  fetchJson,
  type DashboardResponse,
  type MensagemTemplate,
  type ScrapperConfigResponse,
} from "@/lib/api";

type Props = {
  dash: DashboardResponse | undefined;
  templates: MensagemTemplate[] | undefined;
  defaultTemplateId: string | undefined;
  scrapperConfig: ScrapperConfigResponse | undefined;
  onDashRefresh: () => void;
  onScrapperConfigRefresh: () => void;
  onFixRamo: () => Promise<void>;
  fixBusy: boolean;
  fixOut: string | null;
};

function msToSecondsInput(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return String(value / 1000);
}

function secondsInputToMs(value: string, fallback: number) {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed * 1000);
}

export function SendSection({
  dash,
  templates,
  defaultTemplateId,
  scrapperConfig,
  onDashRefresh,
  onScrapperConfigRefresh,
  onFixRamo,
  fixBusy,
  fixOut,
}: Props) {
  const [templateId, setTemplateId] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [resetLista, setResetLista] = useState(false);
  const [phoneDelayInput, setPhoneDelayInput] = useState("2");
  const [messageDelayInput, setMessageDelayInput] = useState("1");
  const [configDirty, setConfigDirty] = useState(false);
  const [err, setErr] = useState("");
  const [saveConfigBusy, setSaveConfigBusy] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [startBusy, setStartBusy] = useState(false);
  const [stopBusy, setStopBusy] = useState(false);
  const logPoll = useRef<ReturnType<typeof setInterval> | null>(null);

  const running = dash?.scrapperRunning === true;
  const contatos = dash?.counts?.pessoas ?? 0;
  const progresso = dash?.progress?.lastIndex ?? 0;
  const selectedTemplateId = templateId || defaultTemplateId || templates?.[0]?.id || "";
  const progressoPassouDaLista = contatos > 0 && progresso >= contatos;
  const currentPhoneDelayMs = secondsInputToMs(phoneDelayInput, scrapperConfig?.phoneTypingDelayMs ?? 2000);
  const currentMessageDelayMs = secondsInputToMs(messageDelayInput, scrapperConfig?.messageTypingDelayMs ?? 1000);

  useEffect(() => {
    if (scrapperConfig && !configDirty) {
      setPhoneDelayInput(msToSecondsInput(scrapperConfig.phoneTypingDelayMs));
      setMessageDelayInput(msToSecondsInput(scrapperConfig.messageTypingDelayMs));
    }
  }, [configDirty, scrapperConfig]);

  const stopLogPoll = useCallback(() => {
    if (logPoll.current) {
      clearInterval(logPoll.current);
      logPoll.current = null;
    }
  }, []);

  const pullLogs = useCallback(async () => {
    try {
      const data = await fetchJson<{ lines?: string[] }>(apiUrl("/api/scrapper/logs?tail=1200"));
      if (data.lines) setLogLines(data.lines);
    } catch {
      // ignora erro temporario de rede.
    }
  }, []);

  const startLogPoll = useCallback(() => {
    stopLogPoll();
    void pullLogs();
    logPoll.current = setInterval(async () => {
      await pullLogs();
      try {
        const status = await fetchJson<{ running?: boolean }>(apiUrl("/api/scrapper/status"));
        if (!status.running) {
          stopLogPoll();
          onDashRefresh();
        }
      } catch {
        // ignora erro temporario de rede.
      }
    }, 1200);
  }, [onDashRefresh, pullLogs, stopLogPoll]);

  useEffect(() => {
    if (running) {
      startLogPoll();
      return stopLogPoll;
    }
    return undefined;
  }, [running, startLogPoll, stopLogPoll]);

  useEffect(() => stopLogPoll, [stopLogPoll]);

  const saveTypingConfig = async () => {
    setErr("");
    setSaveConfigBusy(true);
    try {
      await fetchJson(apiUrl("/api/scrapper/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneTypingDelayMs: currentPhoneDelayMs,
          messageTypingDelayMs: currentMessageDelayMs,
        }),
      });
      setConfigDirty(false);
      onScrapperConfigRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setSaveConfigBusy(false);
    }
  };

  const start = async () => {
    setErr("");

    if (!selectedTemplateId) {
      setErr("Crie pelo menos uma mensagem no passo 2 antes de enviar.");
      return;
    }

    if (contatos <= 0) {
      setErr("Sua lista ainda esta vazia. Organize o JSON no passo 1 antes de iniciar o WhatsApp.");
      return;
    }

    if (!resetLista && progressoPassouDaLista) {
      setErr(
        `O progresso salvo esta em ${progresso}, mas a lista atual tem ${contatos} contato(s). Marque para recomecar do inicio ou zere o progresso.`
      );
      return;
    }

    setStartBusy(true);
    try {
      await fetchJson<{ message?: string }>(apiUrl("/api/scrapper/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun,
          reset: resetLista,
          templateId: selectedTemplateId,
          phoneTypingDelayMs: currentPhoneDelayMs,
          messageTypingDelayMs: currentMessageDelayMs,
        }),
      });
      setConfigDirty(false);
      onDashRefresh();
      onScrapperConfigRefresh();
      startLogPoll();
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setStartBusy(false);
    }
  };

  const stop = async () => {
    setErr("");
    setStopBusy(true);
    try {
      await fetchJson(apiUrl("/api/scrapper/stop"), { method: "POST" });
      stopLogPoll();
      onDashRefresh();
      await pullLogs();
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setStopBusy(false);
    }
  };

  const resetProgress = async () => {
    setErr("");
    try {
      await fetchJson(apiUrl("/api/progress/reset"), { method: "POST" });
      onDashRefresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section id="enviar" className="scroll-mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
      <div className="mb-2 flex items-center gap-2">
        <MessageCircle className="size-6 text-green-400" aria-hidden />
        <h2 className="text-xl font-semibold text-zinc-50">Passo 3 - Mandar no WhatsApp Web</h2>
      </div>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
        <strong className="text-zinc-300">O que isso faz?</strong> Abre o Chrome na sua maquina com o WhatsApp Web.
        Para cada pessoa da <strong>lista boa</strong>, coloca o numero na busca e escreve a{" "}
        <strong>mensagem que voce montou</strong>. Deixe <em>ensaio</em> ligado se quiser apenas testar sem enviar.
      </p>

      <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-100/90">
        Agora voce tem <strong>{contatos}</strong> pessoa(s) na lista e o progresso salvo esta em{" "}
        <strong>{progresso}</strong>.
        {contatos === 0 ? " Organize um JSON primeiro." : null}
        {contatos > 0 && progressoPassouDaLista ? " O progresso atual ja passou do fim dessa lista." : null}
      </div>

      <label className="mb-3 block text-sm font-medium text-zinc-300">
        Qual mensagem usar nesta rodada?
        <select
          value={selectedTemplateId}
          onChange={(event) => setTemplateId(event.target.value)}
          className="mt-1.5 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        >
          {(templates ?? []).map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-4 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-300">
          Tempo para digitar cada digito do numero (segundos)
          <input
            type="number"
            min="0"
            step="0.1"
            value={phoneDelayInput}
            onChange={(event) => {
              setPhoneDelayInput(event.target.value);
              setConfigDirty(true);
            }}
            className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-300">
          Tempo para digitar cada caractere da mensagem (segundos)
          <input
            type="number"
            min="0"
            step="0.1"
            value={messageDelayInput}
            onChange={(event) => {
              setMessageDelayInput(event.target.value);
              setConfigDirty(true);
            }}
            className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
          />
        </label>
        <p className="md:col-span-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/85">
          Alerta: mudar o tempo pode ocasionar no aumento de chances de banimento do seu WhatsApp.
        </p>
        <div className="md:col-span-2">
          <button
            type="button"
            disabled={saveConfigBusy}
            onClick={() => void saveTypingConfig()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
          >
            {saveConfigBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
            Salvar tempos
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 text-sm text-zinc-400">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(event) => setDryRun(event.target.checked)}
            className="rounded border-zinc-600"
          />
          <span>
            <strong className="text-zinc-300">Modo ensaio</strong> - abre a conversa e escreve a mensagem, mas{" "}
            <strong>nao clica em enviar</strong>.
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={resetLista}
            onChange={(event) => setResetLista(event.target.checked)}
            className="rounded border-zinc-600"
          />
          <span>
            <strong className="text-zinc-300">Comecar do primeiro da lista de novo</strong> (zera o progresso salvo).
          </span>
        </label>
      </div>

      {err ? (
        <p className="mb-3 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {err}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={running || startBusy}
          onClick={() => void start()}
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-40"
        >
          {startBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
          {dryRun ? "Iniciar ensaio no WhatsApp" : "Iniciar envio real"}
        </button>
        <button
          type="button"
          disabled={!running || stopBusy}
          onClick={() => void stop()}
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 hover:bg-red-500/20 disabled:opacity-40"
        >
          {stopBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Square className="size-4" aria-hidden />}
          Parar
        </button>
        <button
          type="button"
          onClick={() => void resetProgress()}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className="size-4" aria-hidden />
          So zerar o progresso
        </button>
        <button
          type="button"
          onClick={() => void pullLogs()}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          <Terminal className="size-4" aria-hidden />
          Atualizar texto de status
        </button>
      </div>

      <details className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/40">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-300">
          <ChevronDown className="size-4 group-open:rotate-180" aria-hidden />
          Extra: ajustar "Psicologo / Psicologa" no texto
        </summary>
        <div className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
          <p className="mb-2">
            <strong className="text-zinc-400">O que isso faz?</strong> Corrige o genero da palavra do ramo usando o
            nome. E opcional.
          </p>
          <button
            type="button"
            disabled={fixBusy}
            onClick={() => void onFixRamo()}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
          >
            {fixBusy ? <Loader2 className="inline size-4 animate-spin" aria-hidden /> : null} Rodar ajuste
          </button>
          {fixOut ? (
            <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-zinc-800 bg-black/40 p-3 font-mono text-[11px] text-zinc-400">
              {fixOut}
            </pre>
          ) : null}
        </div>
      </details>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          <Terminal className="size-3.5" aria-hidden />
          O que o robo esta fazendo (texto cru)
        </div>
        <pre className="max-h-[360px] min-h-[180px] overflow-auto bg-black/50 p-4 font-mono text-[11px] leading-relaxed text-zinc-400">
          {logLines.length ? logLines.join("\n") : "Ainda nao comecou. Clique em iniciar quando a lista estiver pronta."}
        </pre>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
        <a href={apiUrl("/api/db/pessoas-DB.json")} download className="text-violet-400 underline hover:text-violet-300">
          Baixar lista de contatos
        </a>
        <a href={apiUrl("/api/db/clinicas-DB.json")} download className="text-zinc-400 underline hover:text-zinc-300">
          Baixar lugares/empresas
        </a>
        <a href={apiUrl("/api/db/invalidos-DB.json")} download className="text-violet-400 underline hover:text-violet-300">
          Baixar ignorados
        </a>
        <a href={apiUrl("/api/db/progress.json")} download className="text-violet-400 underline hover:text-violet-300">
          Baixar progresso
        </a>
      </div>
    </section>
  );
}
