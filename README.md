# Scrapper WhatsApp

Projeto com duas partes:

- `src/server.js`: backend Express com a API e o scrapper Puppeteer
- `web/`: interface Next.js + Tailwind que consome essa API

O backend nao serve mais uma interface propria. A UI oficial fica no Next.

## Subir tudo em desenvolvimento

Na raiz do projeto:

```bash
npm run dev
```

Isso sobe:

- API em `http://localhost:3847`
- Web em `http://localhost:3000`

## Rodar separado

API:

```bash
npm run serve
```

Web:

```bash
npm run web:dev
```

## Fluxo

1. Abra a web em `http://localhost:3000`
2. Envie o JSON no passo 1
3. Ajuste ou escolha a mensagem no passo 2
4. Inicie o WhatsApp no passo 3

Se quiser usar o dataset padrao salvo em `src/db`, use o botao "Organizar arquivo local do servidor" na interface web.

## Arquivos importantes

- `src/db-pipeline.js`: normaliza o JSON e gera `pessoas-DB.json`, `clinicas-DB.json` e `invalidos-DB.json`
- `src/launch-scrapper.js`: abre o WhatsApp Web e percorre `pessoas-DB.json`
- `web/src/app/api/[...path]/route.ts`: proxy do Next para a API Express
- `web/src/components/dashboard/*`: tela principal do painel
