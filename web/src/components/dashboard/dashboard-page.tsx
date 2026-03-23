"use client";

import useSWR from "swr";
import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  HeartHandshake,
  ListOrdered,
  Loader2,
  Sparkles,
  Store,
  UserX,
} from "lucide-react";
import {
  apiUrl,
  fetchJson,
  type DashboardResponse,
  type MensagensConfigResponse,
  type OrganizarResposta,
  type ScrapperConfigResponse,
} from "@/lib/api";
import { StatCard } from "./stat-card";
import { OrganizeSection } from "./organize-section";
import { AfterOrganizePanel } from "./after-organize-panel";
import { InvalidosModal } from "./invalidos-modal";
import { ScriptsSection } from "./scripts-section";
import { SendSection } from "./send-section";

const NAV = [
  { href: "#comecar", label: "1. Sua lista" },
  { href: "#mensagens", label: "2. Mensagens" },
  { href: "#enviar", label: "3. WhatsApp" },
] as const;

export function DashboardPage() {
  const dashKey = apiUrl("/api/dashboard");
  const msgKey = apiUrl("/api/mensagens-prospeccao");
  const scrapperConfigKey = apiUrl("/api/scrapper/config");

  const { data: dash, error: dashErr, isLoading: dashLoading, mutate: mutDash } = useSWR<DashboardResponse>(
    dashKey,
    (u: string) => fetchJson<DashboardResponse>(u),
    { refreshInterval: 10000, revalidateOnFocus: true }
  );

  const {
    data: mensagens,
    isLoading: msgLoading,
    mutate: mutMsg,
  } = useSWR<MensagensConfigResponse>(msgKey, (u: string) => fetchJson<MensagensConfigResponse>(u));

  const { data: scrapperConfig, mutate: mutScrapperConfig } = useSWR<ScrapperConfigResponse>(
    scrapperConfigKey,
    (u: string) => fetchJson<ScrapperConfigResponse>(u)
  );

  const [ultimoOrganizar, setUltimoOrganizar] = useState<OrganizarResposta | null>(null);
  const [modalIgnorados, setModalIgnorados] = useState(false);
  const [fixBusy, setFixBusy] = useState(false);
  const [fixOut, setFixOut] = useState<string | null>(null);

  const ok = !dashErr && dash?.ok;
  const running = dash?.scrapperRunning === true;

  const runFixRamo = async () => {
    setFixOut(null);
    setFixBusy(true);
    try {
      const data = await fetchJson<{ result?: unknown; raw?: string }>(apiUrl("/api/fix-ramo"), {
        method: "POST",
      });
      setFixOut(
        data.result != null ? JSON.stringify(data.result, null, 2) : data.raw ?? JSON.stringify(data, null, 2)
      );
      await mutDash();
    } catch (error) {
      setFixOut(error instanceof Error ? error.message : String(error));
    } finally {
      setFixBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-zinc-950 text-zinc-100 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 py-5 lg:sticky lg:top-0 lg:h-svh lg:w-[min(100%,260px)] lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300">
            <HeartHandshake className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-base font-bold tracking-tight text-white">Mensagens no Zap</p>
            <p className="text-xs text-zinc-500">Simples. Em 3 passos.</p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          Voce manda seu arquivo, escolhe o texto e o computador abre o WhatsApp Web para ajudar a conversar com cada
          contato, com cuidado e no seu ritmo.
        </p>
        <nav className="mt-5 flex flex-row flex-wrap gap-1 border-t border-zinc-800/80 pt-4 lg:flex-col lg:gap-0.5">
          {NAV.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="mt-4 flex items-center gap-2 border-t border-zinc-800/80 pt-4 text-xs lg:mt-auto">
          {dashErr ? (
            <>
              <AlertCircle className="size-4 text-amber-400" aria-hidden />
              <span className="text-zinc-500">
                Suba tudo pela raiz com <code className="text-amber-200/80">npm run dev</code>
              </span>
            </>
          ) : dashLoading ? (
            <>
              <Loader2 className="size-4 animate-spin text-zinc-500" aria-hidden />
              <span className="text-zinc-500">Conectando...</span>
            </>
          ) : ok ? (
            <>
              <CheckCircle2 className="size-4 text-emerald-400" aria-hidden />
              <span className="text-zinc-500">Tudo certo com o servidor</span>
            </>
          ) : (
            <>
              <AlertCircle className="size-4 text-amber-400" aria-hidden />
              <span className="text-zinc-500">Algo estranho na resposta</span>
            </>
          )}
        </div>
        {running ? <p className="mt-2 text-xs font-medium text-emerald-400/90">Envio automatico rodando agora.</p> : null}
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:max-w-[960px]">
        <header className="mb-10">
          <p className="text-sm font-medium text-violet-400">Para quem nunca usou</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Transforme sua lista em conversas no WhatsApp
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
            Sem nomes complicados: primeiro voce <strong className="text-zinc-200">organiza</strong> o arquivo, depois{" "}
            <strong className="text-zinc-200">escreve</strong> o que quer mandar, por ultimo{" "}
            <strong className="text-zinc-200">liga o robo</strong> no WhatsApp Web neste computador.
          </p>
          <p className="mt-3 text-sm text-zinc-600">
            Desenvolvimento local: pela raiz do projeto rode{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5">npm run dev</code> para subir API e web juntos.
          </p>
        </header>

        <section className="mb-10" aria-label="Resumo dos numeros">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-5 text-violet-400" aria-hidden />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Resumo rapido</h2>
          </div>
          <p className="mb-4 text-sm text-zinc-500">
            Estes numeros sao o que esta salvo agora no servidor depois do ultimo "organizar".
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Quem pode receber mensagem"
              value={dash?.counts?.pessoas ?? "-"}
              sub="Lista boa · vai no WhatsApp automatico"
              icon={HeartHandshake}
            />
            <StatCard
              label="Lugares / empresas separados"
              value={dash?.counts?.clinicas ?? "-"}
              sub="Nao entram no envio automatico · so arquivo separado"
              icon={Store}
            />
            <StatCard
              label="Ignorados pelo sistema"
              value={dash?.counts?.invalidos ?? "-"}
              sub="O robo nao manda sozinho · confira o motivo"
              icon={UserX}
            />
            <StatCard
              label="Ate onde voce parou"
              value={dash?.progress?.lastIndex ?? "-"}
              sub="Proximo numero da fila"
              icon={ListOrdered}
              accent
            />
          </div>
        </section>

        <OrganizeSection
          onSuccess={(data) => setUltimoOrganizar(data)}
          onRefreshResumo={() => void mutDash()}
          localDatasetName={dash?.pipelineLocalFile}
        />

        {ultimoOrganizar?.ok ? (
          <AfterOrganizePanel result={ultimoOrganizar} onVerIgnorados={() => setModalIgnorados(true)} />
        ) : null}

        <ScriptsSection config={mensagens} loading={msgLoading} onSaved={() => void mutMsg()} />

        <SendSection
          dash={dash}
          templates={mensagens?.templates}
          defaultTemplateId={mensagens?.activeTemplateId}
          scrapperConfig={scrapperConfig}
          onDashRefresh={() => void mutDash()}
          onScrapperConfigRefresh={() => void mutScrapperConfig()}
          onFixRamo={runFixRamo}
          fixBusy={fixBusy}
          fixOut={fixOut}
        />

        <footer className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 text-sm leading-relaxed text-zinc-400">
          O desenvolvedor nao se responsabiliza por mal uso da ferramenta. Este projeto foi feito para estudos e deve
          ser usado com responsabilidade, respeitando as regras da plataforma e o consentimento dos contatos.
        </footer>
      </main>

      <InvalidosModal open={modalIgnorados} onClose={() => setModalIgnorados(false)} />
    </div>
  );
}
