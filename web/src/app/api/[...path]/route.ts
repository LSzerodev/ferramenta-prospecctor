import { NextRequest } from "next/server";

export const runtime = "nodejs";

const BACKEND_BASE = (process.env.BACKEND_URL ?? "http://127.0.0.1:3847").replace(/\/$/, "");
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

function buildUpstreamUrl(request: NextRequest, path: string[]) {
  const url = new URL(request.url);
  const pathname = path.map(encodeURIComponent).join("/");
  const search = url.search || "";
  return `${BACKEND_BASE}/api/${pathname}${search}`;
}

async function proxy(request: NextRequest, path: string[]) {
  try {
    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.delete("host");
    upstreamHeaders.delete("connection");
    upstreamHeaders.delete("content-length");

    const upstream = await fetch(buildUpstreamUrl(request, path), {
      method: request.method,
      headers: upstreamHeaders,
      body: METHODS_WITHOUT_BODY.has(request.method) ? undefined : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    });

    const headers = new Headers(upstream.headers);
    headers.delete("content-length");
    headers.delete("connection");
    headers.delete("transfer-encoding");

    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao acessar o backend.";
    return Response.json(
      {
        ok: false,
        error: message,
        backendBase: BACKEND_BASE,
      },
      { status: 502 }
    );
  }
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}
