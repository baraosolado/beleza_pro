# Beleza Pro

## O que é

Beleza Pro é um SaaS de gestão para profissionais de beleza autônomos no Brasil (manicures, cabeleireiros, esteticistas). Permite gerenciar clientes, agenda e **cobranças para controle interno** (valor, vencimento, status), com lembretes pelo WhatsApp e envio de conta em PDF via n8n quando configurado.

## Stack

| Camada     | Tecnologia                          |
| ---------- | ----------------------------------- |
| Frontend   | Next.js 14 (App Router), React, Tailwind CSS |
| Backend    | Node.js, Fastify                    |
| Banco      | PostgreSQL 16, Prisma ORM           |
| Auth       | JWT (access 15min + refresh 7d), Argon2 |
| WhatsApp   | uazapi (self-hosted, Baileys)       |
| Fila       | BullMQ, Redis 7                      |

## Como rodar localmente

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose

### Passo a passo

1. Clone o repositório.
2. Copie o arquivo de ambiente: `cp .env.example .env`
3. Preencha as variáveis no `.env` (veja seção [Variáveis de ambiente](#variáveis-de-ambiente)).
4. Suba o banco e o Redis: `docker-compose up -d`
5. Instale as dependências: `npm install`
6. Gere o cliente Prisma: `npm run db:generate -w api`
7. Rode as migrations: `npm run db:migrate`
8. Inicie o projeto: `npm run dev`
9. Acesse o frontend: http://localhost:3000 e a API: http://localhost:3001

## Estrutura de pastas

```
├── apps/
│   ├── api/                 # Backend Fastify
│   │   └── src/
│   │       ├── config/      # env e config
│   │       ├── controllers/
│   │       ├── db/prisma/   # schema e migrations
│   │       ├── integrations/ # uazapi, n8n helpers
│   │       ├── jobs/        # workers BullMQ (whatsapp, reminders)
│   │       ├── lib/
│   │       ├── middleware/  # auth, plan
│   │       ├── routes/
│   │       ├── services/
│   │       └── server.ts
│   └── web/                 # Frontend Next.js 14
│       ├── app/             # App Router (public, app)
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── tailwind.config.ts
├── packages/
│   └── types/               # Tipos compartilhados
├── docker-compose.yml       # PostgreSQL 16 + Redis 7
├── .env.example
└── package.json            # Workspaces npm
```

## Fluxos principais

### 1. Novo agendamento

O profissional cria um agendamento → o sistema pode enviar confirmação por WhatsApp → agenda job de lembrete 24h antes. Cobranças são registradas manualmente (controle de valores e status).

### 2. Lembrete automático

O worker de lembretes (BullMQ) dispara 24h antes do horário → verifica se o agendamento segue ativo → envia mensagem via uazapi → marca `reminder_sent`.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| -------- | ----------- | --------- |
| `DATABASE_URL` | Sim | URL do PostgreSQL (ex.: `postgresql://user:pass@localhost:5432/beleza_saas`) |
| `JWT_SECRET` | Sim | Segredo para assinatura do access token |
| `JWT_REFRESH_SECRET` | Sim | Segredo para o refresh token |
| `JWT_EXPIRES_IN` | Não | Expiração do access token (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Não | Expiração do refresh token (default: `7d`) |
| `UAZAPI_BASE_URL` | Não | URL base do uazapi (ex.: `http://localhost:8080`) |
| `UAZAPI_TOKEN` | Não | Token do uazapi |
| `N8N_INVOICE_PREVIEW_WEBHOOK_URL` | Não | URL do webhook n8n para gerar pré-visualização do PDF da conta |
| `N8N_INVOICE_SEND_WEBHOOK_URL` | Não | URL do webhook n8n para enviar a conta por WhatsApp |
| `REDIS_URL` | Sim | URL do Redis (ex.: `redis://localhost:6379`) |
| `NEXT_PUBLIC_API_URL` | Não | URL base da API para o frontend (ex.: `http://localhost:3001/api`) |
| `APP_URL` | Não | URL do frontend (ex.: `http://localhost:3000`) |
| `NODE_ENV` | Não | `development`, `production` ou `test` |

## Riscos conhecidos

- **uazapi** utiliza integração não oficial com o WhatsApp; há risco de banimento do número. Recomenda-se usar número secundário para testes e produção.
- Limite de 30 mensagens por hora por instância (rate limit no worker) para reduzir risco de bloqueio.

## Avisos de dependências (deprecated)

No `npm install` ou no build Docker podem aparecer avisos de pacotes deprecated (rimraf, glob, eslint@8, etc.). A maioria vem de dependências transitivas do Next.js 14 e do ESLint 8. Para eliminá-los seria necessário migrar para Next.js 15 e ESLint 9; até lá os avisos não impedem o build nem o funcionamento. Mantenha as dependências atualizadas com `npm update` para receber patches dentro da mesma versão major.

## Deploy (Easypanel / Docker)

O repositório tem **dois Dockerfiles**: um na raiz (frontend) e um em `apps/api/` (backend). Em painéis como o Easypanel você usa **dois serviços** apontando para o **mesmo repositório**, cada um com seu Dockerfile.

### Frontend (Next.js)

- **Dockerfile:** na raiz do repositório (`Dockerfile`).
- No Easypanel: crie o serviço do front, conecte o repositório; o build usa o `Dockerfile` da raiz por padrão.
- **Build args** (se o painel permitir): `NEXT_PUBLIC_API_URL` (para o build do Next.js).
- **Porta:** 3000.

### Backend (API Fastify)

- **Dockerfile:** `apps/api/Dockerfile` (não o da raiz).
- No Easypanel: crie **outro serviço** para a API, mesmo repositório, e configure:
  - **Caminho do Dockerfile:** `apps/api/Dockerfile`
  - **Contexto de build:** raiz do repositório (`.`)
- Ao subir, o container roda `entrypoint.sh`: executa `prisma migrate deploy` e depois inicia o servidor na porta 3001.
- **Variáveis de ambiente obrigatórias:** `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`. As demais seguem o `.env.example`.
- **Dependências:** PostgreSQL e Redis precisam existir antes (outros serviços no painel ou externos). A API expõe `GET /health` (sem auth) para healthcheck.
- **Porta:** 3001.

### Resumo

| Serviço   | Dockerfile            | Porta |
| --------- | --------------------- | ----- |
| Frontend  | `Dockerfile` (raiz)   | 3000  |
| Backend   | `apps/api/Dockerfile` | 3001  |

No front, configure `NEXT_PUBLIC_API_URL` com a URL pública da API (ex.: `https://sua-api.exemplo.com/api`) para o browser conseguir chamar o backend.

## Scripts úteis

| Comando | Descrição |
| ------- | --------- |
| `npm run dev` | Sobe API e frontend em modo desenvolvimento |
| `npm run build` | Build dos workspaces (types, api, web) |
| `npm run db:migrate` | Roda migrations (Prisma migrate dev) |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run dev -w api` | Apenas a API |
| `npm run dev -w web` | Apenas o frontend |
