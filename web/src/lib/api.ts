/**
 * Base da API:
 * - vazio => usa o proxy /api do proprio Next
 * - NEXT_PUBLIC_API_URL => chama o backend direto (CORS na API)
 */
export function apiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalizedPath;
  return `${base}${normalizedPath}`;
}

export type Counts = {
  pessoas: number;
  clinicas: number;
  invalidos: number;
};

export type DashboardResponse = {
  ok: boolean;
  scrapperRunning?: boolean;
  scrapperPid?: number | null;
  counts?: Counts;
  progress?: { lastIndex: number };
  dbDir?: string;
  pipelineLocalFile?: string | null;
  error?: string;
};

export type ArquivoGeradoInfo = {
  tituloSimples: string;
  umaFrase: string;
  arquivoInterno: string;
};

export type IgnoradoLinha = {
  nameOriginal?: string;
  cleanName?: string;
  titleOriginal?: string;
  titleLimpo?: string;
  phone?: string;
  reason?: string;
  motivoParaVoce?: string;
};

export type OrganizarResposta = {
  ok: boolean;
  error?: string;
  counts?: Counts;
  oQueFoiGerado?: {
    pessoas: ArquivoGeradoInfo;
    clinicas: ArquivoGeradoInfo;
    invalidos: ArquivoGeradoInfo;
  };
  ignorados?: {
    lista: IgnoradoLinha[];
    total: number;
    truncado: boolean;
  };
  amostra?: {
    pessoas: unknown[];
    lugares: unknown[];
  };
};

export type PipelineLocalResponse = {
  ok: boolean;
  error?: string;
  counts?: Counts;
  source?: string;
  sourceFile?: string;
};

export type MensagemTemplate = {
  id: string;
  name: string;
  body: string;
};

export type MensagensConfigResponse = {
  ok: boolean;
  templates: MensagemTemplate[];
  activeTemplateId: string;
  placeholders?: { key: string; desc: string }[];
};

export type ScrapperConfig = {
  phoneTypingDelayMs: number;
  messageTypingDelayMs: number;
};

export type ScrapperConfigResponse = {
  ok: boolean;
  phoneTypingDelayMs: number;
  messageTypingDelayMs: number;
  error?: string;
};

export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, cache: "no-store" });
  const text = await response.text();

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || response.statusText);
  }

  if (!response.ok) {
    const err = data as { error?: string };
    throw new Error(err?.error ?? `HTTP ${response.status}`);
  }

  return data as T;
}
