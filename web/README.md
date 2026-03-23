# Web

Interface Next.js do projeto.

## Desenvolvimento

Pela raiz do projeto, prefira:

```bash
npm run dev
```

Se quiser subir so a web:

```bash
npm run web:dev
```

## Integracao com o backend

Por padrao a web usa o proxy interno em `src/app/api/[...path]/route.ts`, que encaminha `/api/*` para o backend Express em `http://127.0.0.1:3847`.

Se precisar apontar direto para outro backend, defina:

```bash
NEXT_PUBLIC_API_URL=http://host:porta
```
