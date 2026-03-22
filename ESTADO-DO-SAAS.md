# Beleza Pro — Inventário do SaaS (o que tem, o que foi feito, o que falta)

Documento de referência do produto. **Atualize este arquivo** quando entregar novas features.

---

## 1. Visão geral

- **Produto**: SaaS de gestão para profissionais de beleza no Brasil (autônomos e pequenos estúdios).
- **Foco**: clientes, agenda, cobranças (Pix/Stripe), envio de fatura por WhatsApp (n8n), produtos/estoque básico.
- **Stack**:
  - **Web**: Next.js 14 (App Router), React, Tailwind, TanStack Query, react-hook-form, Zod.
  - **API**: Node.js, Fastify, Prisma, PostgreSQL.
  - **Auth**: JWT (access + refresh), hash de senha (Argon2).
  - **Filas**: BullMQ + Redis (WhatsApp, lembretes).
  - **Pagamentos**: Stripe (Pix, cartão).
  - **WhatsApp**: uazapi; automações complementares via **n8n** (webhooks de fatura).

---

## 2. O que o sistema já tem (implementado)

### 2.1 Autenticação e conta

| Item | Status |
|------|--------|
| Cadastro | Feito |
| Login | Feito |
| Refresh token | Feito |
| Esqueci senha / reset | Feito |
| Plano do usuário (`trial` / `basic` / `pro`) | Feito (persistido; usado em middleware e regras de cobrança) |

**Telas**: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`.

---

### 2.2 Dashboard

| Item | Status |
|------|--------|
| Agendamentos do dia | Feito |
| Resumo financeiro (recebido, pendente, inadimplente) | Feito |
| Ajuste em “valores recebidos” no mês (`paidAt` + fallback com `dueDate`) | Feito |
| Clientes ativos / métricas resumidas | Feito |

**Tela**: `/dashboard`.

---

### 2.3 Agenda (agendamentos)

| Item | Status |
|------|--------|
| Listagem por dia | Feito |
| Novo agendamento (cliente + serviço) | Feito |
| Edição de agendamento | Feito |
| Estados: agendado, confirmado, concluído, cancelado, etc. | Feito |

**Telas**: `/schedule`, `/schedule/new`, `/schedule/[id]`.

---

### 2.4 Clientes

| Item | Status |
|------|--------|
| Listagem com busca | Feito |
| Cadastro | Feito |
| Detalhes (dados, histórico, métricas simples) | Feito |
| Edição | Feito |

**Telas**: `/clients`, `/clients/new`, `/clients/[id]`, `/clients/[id]/edit`.

---

### 2.5 Serviços

| Item | Status |
|------|--------|
| CRUD de serviços (nome, duração, preço, ativo) | Feito |

**Tela**: `/services`.

---

### 2.6 Cobranças e financeiro

| Item | Status |
|------|--------|
| Listagem com filtros (status, período) | Feito |
| Criação de cobrança (cliente, valor, vencimento, descrição) | Feito |
| Detalhe da cobrança | Feito |
| Atualização de status; ao marcar pago, preenche `paidAt` quando vazio | Feito |
| Integração Stripe (Pix QR / copia-e-cola, PaymentIntent) | Feito |
| **Venda de produto**: fluxo a partir de **Produtos → Registrar Venda** → abre modal em **Cobranças** com valor, descrição (nome do produto) e `productId` | Feito |
| Baixa de estoque (–1 unidade) ao criar cobrança com `productId` válido | Feito |
| Coluna **Serviço** na tabela usa `description` (ex.: nome do produto) quando não há agendamento/serviço | Feito |

**Telas**: `/charges`, `/charges/[id]`.

---

### 2.7 Enviar conta / fatura (PDF + WhatsApp)

| Item | Status |
|------|--------|
| Seleção de cliente e cobranças em aberto | Feito |
| Payload JSON padronizado para n8n (cliente, itens, totais, dados do negócio, telefones formatados BR) | Feito |
| Webhook **preview** (`N8N_INVOICE_PREVIEW_WEBHOOK_URL`) — POST | Feito |
| Preview de PDF (incl. tratamento de resposta n8n e base64 → blob no iframe) | Feito |
| Botão **Gerar PDF** (só preview) | Feito |
| Webhook **envio** (`N8N_INVOICE_SEND_WEBHOOK_URL`) — **sem** chamar preview de novo no envio | Feito |
| Botão **Enviar WhatsApp** | Feito |

**Tela**: `/send-invoice`.

---

### 2.8 Configurações

| Item | Status |
|------|--------|
| Perfil: nome, telefone, e-mail (leitura), senha, avatar/iniciais, plano, “membro desde” | Feito |
| Dados do negócio: nome, categoria, Instagram, e-mail, telefone, Pix, endereço | Feito (persistido no `User`) |
| Horários de atendimento (JSON `working_hours`) — UI com toggle e faixa principal | Feito (múltiplos intervalos por dia: parcial / a confirmar no backend) |
| WhatsApp (uazapi): QR / instância | Feito (tela dedicada) |
| Plano e billing na UI | Parcial (cards/planos; **faturamento real recorrente pode não estar completo**) |

**Telas**: `/settings`, `/settings/whatsapp`.

---

### 2.9 Produtos e categorias

| Item | Status |
|------|--------|
| Modelo `Product` e `ProductCategory` no banco | Feito |
| API: listar / criar produtos; **obter por id**; **atualizar** | Feito |
| API: listar / criar categorias | Feito |
| Menu **Produtos** no sidebar | Feito |
| Listagem com abas por categoria, busca, cards | Feito |
| Novo produto | Feito |
| Nova categoria | Feito |
| Editar produto | Feito |
| **Excluir produto** (API + UI) | **Não implementado** |
| Upload real de imagem do produto | **Não implementado** (UI placeholder) |
| Registrar venda → cobrança + estoque | Feito (ver 2.6) |

**Telas**: `/products`, `/products/new`, `/products/[id]/edit`, `/products/categories/new`.

---

### 2.10 API (rotas principais)

Prefixo típico: `/api/...` (proxy no front para a API em `:3001`).

| Área | Rotas (conceito) |
|------|------------------|
| Auth | `/auth/*` |
| Clientes | `/clients` |
| Serviços | `/services` |
| Agendamentos | `/appointments` |
| Cobranças | `/charges` |
| Dashboard | `/dashboard` |
| Configurações | `/settings` |
| Enviar fatura | `/send-invoice` |
| Produtos | `/products`, `/products/:id` |
| Categorias | `/product-categories` |
| Webhooks | `/webhooks` (Stripe, etc.) |

---

### 2.11 Segurança e multi-tenant

| Item | Status |
|------|--------|
| Dados escopados por `userId` nas queries | Feito no padrão atual |
| Middleware de autenticação nas rotas protegidas | Feito (ex.: produtos/categorias corrigidos para usar `authenticate`) |
| RLS Supabase | **Não** — banco é PostgreSQL direto com Prisma (não é stack Supabase neste repo) |

---

## 3. O que ainda falta ou está incompleto

### 3.1 Produtos / estoque (evoluções)

- [ ] Exclusão de produto (soft delete ou hard delete).
- [ ] Upload de imagem (ex.: Supabase Storage, S3 ou API própria).
- [ ] Quantidade vendida > 1 no mesmo fluxo (hoje a baixa é fixa em **1** unidade por cobrança com `productId`).
- [ ] Relatório de giro de estoque / margem por produto.
- [ ] Vincular venda de produto ao agendamento (opcional).

### 3.2 Cobranças / UX

- [ ] Campos “forma de pagamento” e “gerar cobrança” no modal de cobranças são em parte **UI**; alinhar 100% com regras de negócio se necessário.
- [ ] Reverter estoque se cobrança for cancelada (não garantido hoje).

### 3.3 Multi-profissional / equipe

- [ ] Modelo de profissionais, agenda por profissional, permissões.
- [ ] Relatórios por profissional.

### 3.4 Agendamento online (cliente final)

- [ ] Página pública do estúdio (`/s/[slug]` ou similar).
- [ ] Booking self-service ou, na v1, só “Agendar pelo WhatsApp”.

### 3.5 Relatórios

- [ ] Faturamento por serviço / cliente / período.
- [ ] Exportação CSV/Excel.
- [ ] Comparativos de período.

### 3.6 Automação de marketing

- [ ] Templates editáveis no painel.
- [ ] Regras: aniversário, reativação, pós-atendimento (além do que jobs/n8n já permitirem).

### 3.7 Escala SaaS

- [ ] Múltiplas unidades / tenant `Account`.
- [ ] Planos por número de profissionais ou unidades.

### 3.8 Onboarding

- [ ] Tour ou checklist no primeiro login (serviços, horários, cliente, WhatsApp, Stripe).

### 3.9 Qualidade e ops

- [ ] Testes E2E dos fluxos críticos (login, cobrança, envio fatura).
- [ ] Monitoramento (ex.: Sentry) em produção.
- [ ] Documentação de variáveis de ambiente sempre alinhada ao `.env.example`.

---

## 4. Roadmap resumido (sugestão)

1. **Curto prazo**: estabilizar envio de fatura + WhatsApp; horários (múltiplos intervalos ou documentar limitação); exclusão/edição completa de produtos; upload de imagem.
2. **Médio prazo**: multi-profissional básico; página pública; relatórios simples.
3. **Longo prazo**: automações de marketing avançadas; multi-unidade; relatórios comparativos.

---

## 5. Documentos relacionados

- `README.md` — como rodar o projeto localmente.
- `proximos-passos.md` — análise de gaps vs. concorrentes e fases (pode divergir em detalhes; **este arquivo `ESTADO-DO-SAAS.md` prioriza o que está no código**).

---

*Última revisão sugerida: março/2026 — ajuste as datas e checkboxes conforme o time for entregando features.*
