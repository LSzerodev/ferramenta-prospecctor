# Scrapper WhatsApp

Projeto com duas partes:

- `src/server.js`: backend Express com a API e o scrapper Puppeteer
- `web/`: interface Next.js + Tailwind que consome essa API

O backend nao serve mais uma interface propria. A UI oficial fica no Next.

## Funciona para quem clonar?

Sim, para uso local no computador da pessoa. Quem clonar o repositorio consegue usar normalmente desde que:

- instale as dependencias da raiz e da pasta `web`
- rode o projeto localmente
- faca login no WhatsApp Web quando o navegador abrir
- envie o proprio JSON ou coloque um dataset local em `src/db`

Se a ideia for hospedar isso como um site publico para qualquer pessoa usar no navegador, ai nao e plug and play. O scrapper abre o WhatsApp Web via Puppeteer na maquina onde o backend esta rodando, entao essa arquitetura e voltada para uso local.

## O Que Precisa Instalar Para Funcionar

Antes de tentar rodar o projeto, instale isto:

- Git, para clonar o repositorio: [https://git-scm.com/downloads](https://git-scm.com/downloads)
- Node.js LTS, para rodar o backend e o Next: [https://nodejs.org/en/download](https://nodejs.org/en/download)
- VS Code, para abrir e editar o projeto: [https://code.visualstudio.com/Download](https://code.visualstudio.com/Download)

O `npm` ja vem junto com o Node.js.

## Requisitos

- Node.js 20 ou superior
- npm instalado junto com o Node.js
- internet para instalar as dependencias
- um WhatsApp que possa ser autenticado no WhatsApp Web

Nao precisa configurar `.env` para rodar tudo localmente.

## Instalacao Apos Clonar

Clone o repositorio:

```bash
git clone https://github.com/LSzerodev/ferramenta-prospecctor.git
cd ferramenta-prospecctor
```

Na raiz do projeto:

```bash
npm install
npm install --prefix web
```

## Subir tudo em desenvolvimento

Na raiz do projeto:

```bash
npm run dev
```

Isso sobe:

- API em `http://localhost:3847`
- Web em `http://localhost:3000`

## Primeiro Uso

1. Rode `npm run dev`
2. Abra `http://localhost:3000`
3. Envie seu JSON no passo 1 ou coloque um arquivo `.json` de origem dentro de `src/db` para usar o botao de arquivo local
4. Escolha e ajuste a mensagem no passo 2
5. No passo 3, configure os tempos se quiser e inicie o scrapper
6. Quando o navegador abrir, autentique o WhatsApp Web

Sem organizar um JSON primeiro, o envio nao vai executar porque `pessoas-DB.json` nao existe ou estara vazio.

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
Se existir mais de um `.json` de origem em `src/db`, o backend escolhe automaticamente o mais recente, priorizando o nome antigo padrao quando ele existir.

## O Que Nao Vai Para O Git

Alguns arquivos sao gerados em runtime e por isso nao sobem para o repositorio:

- `profile-zap/`
- `src/db/pessoas-DB.json`
- `src/db/clinicas-DB.json`
- `src/db/invalidos-DB.json`
- `src/db/progress.json`
- datasets grandes exportados para `src/db/dataset_crawler-google-places_*.json`

Cada pessoa que clonar o projeto vai gerar esses arquivos localmente durante o uso.
O `.gitignore` continua importante para evitar subir `node_modules`, sessao do WhatsApp em `profile-zap/`, progresso local e datasets pessoais por engano.

## Arquivos importantes

- `src/db-pipeline.js`: normaliza o JSON e gera `pessoas-DB.json`, `clinicas-DB.json` e `invalidos-DB.json`
- `src/launch-scrapper.js`: abre o WhatsApp Web e percorre `pessoas-DB.json`
- `web/src/app/api/[...path]/route.ts`: proxy do Next para a API Express
- `web/src/components/dashboard/*`: tela principal do painel
