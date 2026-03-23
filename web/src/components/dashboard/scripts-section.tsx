"use client";

import { useEffect, useState } from "react";
import { BookOpen, Loader2, MessageSquareText, Plus, Save, Trash2, Wand2 } from "lucide-react";
import { apiUrl, fetchJson, type MensagemTemplate, type MensagensConfigResponse } from "@/lib/api";

type Props = {
  config: MensagensConfigResponse | undefined;
  loading: boolean;
  onSaved: () => void;
};

export function ScriptsSection({ config, loading, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [localTemplates, setLocalTemplates] = useState<MensagemTemplate[]>([]);
  const [localActive, setLocalActive] = useState("");
  const [newName, setNewName] = useState("");
  const [newBody, setNewBody] = useState("Ola {name}, tudo bem? Vi seu trabalho com {ramo} e queria conversar.");

  useEffect(() => {
    if (config?.templates?.length) {
      setLocalTemplates(config.templates.map((template) => ({ ...template })));
      setLocalActive(config.activeTemplateId || config.templates[0].id);
    }
  }, [config]);

  const placeholders = config?.placeholders ?? [];

  const persist = async (templates: MensagemTemplate[], activeTemplateId: string) => {
    setErr("");
    setBusy(true);
    try {
      await fetchJson<MensagensConfigResponse>(apiUrl("/api/mensagens-prospeccao"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates, activeTemplateId }),
      });
      onSaved();
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const guardarTudo = () => {
    void persist(localTemplates, localActive || localTemplates[0]?.id || "");
  };

  const setActiveAndSave = (id: string) => {
    setLocalActive(id);
    void persist(localTemplates, id);
  };

  const remove = (id: string) => {
    if (!confirm("Apagar esta mensagem?")) return;
    const next = localTemplates.filter((template) => template.id !== id);
    const nextActive = localActive === id ? next[0]?.id ?? "" : localActive;
    setLocalTemplates(next);
    setLocalActive(nextActive);
    void persist(next, nextActive);
  };

  const addNew = () => {
    if (!newName.trim() || !newBody.trim()) {
      setErr("De um nome e escreva o texto.");
      return;
    }
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const next = [...localTemplates, { id, name: newName.trim(), body: newBody.trim() }];
    setLocalTemplates(next);
    setLocalActive(id);
    setNewName("");
    setNewBody("Ola {name}, tudo bem? Vi seu trabalho com {ramo} e queria conversar.");
    void persist(next, id);
  };

  const updateBody = (id: string, body: string) => {
    setLocalTemplates((prev) => prev.map((template) => (template.id === id ? { ...template, body } : template)));
  };

  const updateName = (id: string, name: string) => {
    setLocalTemplates((prev) => prev.map((template) => (template.id === id ? { ...template, name } : template)));
  };

  if (loading && !config) {
    return (
      <section className="mb-10 flex items-center gap-2 text-zinc-500">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Carregando seus textos...
      </section>
    );
  }

  return (
    <section id="mensagens" className="mb-10 scroll-mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
      <div className="mb-2 flex items-center gap-2">
        <MessageSquareText className="size-6 text-sky-400" aria-hidden />
        <h2 className="text-xl font-semibold text-zinc-50">Passo 2 - O que o WhatsApp vai escrever</h2>
      </div>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
        <strong className="text-zinc-300">O que isso faz?</strong> Voce pode ter <strong>varias mensagens</strong>.
        Escolhe uma como padrao e usa atalhos como <code className="rounded bg-zinc-800 px-1">{"{name}"}</code> e{" "}
        <code className="rounded bg-zinc-800 px-1">{"{ramo}"}</code>. No envio a gente troca pelos dados de cada
        pessoa.
      </p>

      <div className="mb-6 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-sky-200">
          <Wand2 className="size-4" aria-hidden />
          Clique para copiar um atalho
        </div>
        <div className="flex flex-wrap gap-2">
          {placeholders.map((placeholder) => (
            <button
              key={placeholder.key}
              type="button"
              title={placeholder.desc}
              onClick={() => void navigator.clipboard.writeText(placeholder.key)}
              className="rounded-lg border border-sky-500/30 bg-zinc-950/50 px-2.5 py-1 font-mono text-xs text-sky-200 transition hover:bg-sky-500/20"
            >
              {placeholder.key}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-sky-200/60">
          Exemplo: "Oi <code className="font-mono">{"{name}"}</code>, vi seu perfil em{" "}
          <code className="font-mono">{"{nameOriginal}"}</code>."
        </p>
      </div>

      {err ? <p className="mb-3 text-sm text-red-400">{err}</p> : null}

      <ul className="space-y-4">
        {localTemplates.map((template) => (
          <li key={template.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-200">
                <input
                  type="radio"
                  name="tpl-active"
                  checked={localActive === template.id}
                  onChange={() => setActiveAndSave(template.id)}
                  className="border-zinc-600 text-violet-600"
                />
                Padrao ao enviar
              </label>
              <button
                type="button"
                onClick={() => remove(template.id)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                aria-label="Apagar"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <input
              type="text"
              value={template.name}
              onChange={(event) => updateName(template.id, event.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
            />
            <textarea
              value={template.body}
              onChange={(event) => updateBody(template.id, event.target.value)}
              rows={4}
              className="mt-2 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || localTemplates.length === 0}
          onClick={() => guardarTudo()}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar textos
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-zinc-600 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Plus className="size-4" aria-hidden />
          Adicionar mais uma mensagem
        </div>
        <input
          type="text"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nome que voce entende (ex.: Segundo contato)"
          className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        />
        <textarea
          value={newBody}
          onChange={(event) => setNewBody(event.target.value)}
          rows={4}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => addNew()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:opacity-40"
        >
          <BookOpen className="size-4" />
          Adicionar e guardar
        </button>
      </div>
    </section>
  );
}
