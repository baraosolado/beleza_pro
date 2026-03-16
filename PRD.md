# PRD — SaaS de Gestão para Profissionais de Beleza Autônomos

> **Versão:** 1.0  
> **Status:** Pronto para desenvolvimento  
> **Stack:** Next.js · Node.js · PostgreSQL · uazapi (self-hosted) · Stripe

---

## 1. Visão do Produto

### 1.1 Problema

Profissionais de beleza autônomos (manicures, cabeleireiros, esteticistas) gerenciam clientes, agendamentos e cobranças via WhatsApp, caderninho e Pix manual. Isso gera:

- Perda de agendamentos por falta de controle
- Inadimplência por falta de cobrança automatizada
- Sem histórico de clientes
- Sem visão financeira do negócio

### 1.2 Solução

Sistema web SaaS simples, barato e feito para o autônomo brasileiro — com agenda, cadastro de clientes, cobrança automática via Pix e lembretes automáticos pelo WhatsApp.

### 1.3 Público-alvo

**Persona principal:** Manicure, cabeleireiro ou esteticista autônomo, MEI, que atende em casa, salão parceiro ou domicílio. Tem smartphone, usa WhatsApp intensamente, não tem familiaridade com ERPs ou sistemas complexos.

### 1.4 Proposta de valor

> "Sua agenda, seus clientes e suas cobranças — tudo em um lugar. Simples como o WhatsApp."

---

## 2. Modelo de Negócio

| Plano | Preço | Recursos |
|---|---|---|
| **Básico** | R$49/mês | Até 100 clientes, agenda, lembretes WhatsApp |
| **Pro** | R$89/mês | Clientes ilimitados + cobrança automática Pix + relatórios financeiros |

- Cobrança recorrente mensal via Stripe
- Trial gratuito de 14 dias (sem cartão)
- Sem taxa de setup

---

## 3. Stack Técnica

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR + RSC |
| Backend | Node.js (Express ou Fastify) | API REST |
| Banco de dados | PostgreSQL | Hospedado (Railway, Supabase ou VPS) |
| WhatsApp | uazapi (self-hosted) | Gratuito, baseado em Baileys |
| Pagamentos | Stripe | Pix, cartão, assinaturas (taxas Stripe) |
| Autenticação | NextAuth.js ou JWT | |
| ORM | Prisma | |
| Fila de mensagens | BullMQ + Redis | Para envio de notificações WhatsApp |
| Deploy | VPS (Hetzner, DigitalOcean) ou Railway | |

---

## 4. Estrutura do Banco de Dados (PostgreSQL)

### 4.1 Tabela: `users`
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone         VARCHAR(20),                        -- telefone do profissional
  plan          VARCHAR(20) DEFAULT 'trial',        -- trial | basic | pro
  plan_expires_at TIMESTAMPTZ,
  stripe_customer_id VARCHAR(100),                   -- ID do cliente no Stripe (assinatura do profissional)
  whatsapp_instance_id VARCHAR(100),                -- ID da instância uazapi
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Tabela: `clients`
```sql
CREATE TABLE clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(20) NOT NULL,              -- usado para enviar WhatsApp
  email         VARCHAR(255),
  notes         TEXT,                              -- observações (alergia, preferências)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Tabela: `services`
```sql
CREATE TABLE services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,             -- ex: Manicure simples
  duration_min  INTEGER NOT NULL DEFAULT 60,       -- duração em minutos
  price         NUMERIC(10,2) NOT NULL,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Tabela: `appointments`
```sql
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id),
  service_id      UUID NOT NULL REFERENCES services(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  status          VARCHAR(30) DEFAULT 'scheduled',
  -- scheduled | confirmed | completed | cancelled | no_show
  notes           TEXT,
  reminder_sent   BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.5 Tabela: `charges`
```sql
CREATE TABLE charges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id      UUID REFERENCES appointments(id),
  client_id           UUID NOT NULL REFERENCES clients(id),
  amount              NUMERIC(10,2) NOT NULL,
  description         TEXT,
  status              VARCHAR(30) DEFAULT 'pending',
  -- pending | paid | overdue | cancelled
  stripe_payment_intent_id VARCHAR(100),            -- ID do PaymentIntent no Stripe
  stripe_pix_qrcode    TEXT,                        -- QR Code Pix
  stripe_pix_copy_paste TEXT,                       -- Pix copia e cola
  due_date            DATE NOT NULL,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.6 Tabela: `whatsapp_messages`
```sql
CREATE TABLE whatsapp_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id),
  appointment_id UUID REFERENCES appointments(id),
  charge_id     UUID REFERENCES charges(id),
  phone         VARCHAR(20) NOT NULL,
  message       TEXT NOT NULL,
  type          VARCHAR(30) NOT NULL,
  -- reminder | charge | confirmation | custom
  status        VARCHAR(20) DEFAULT 'pending',
  -- pending | sent | failed
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.7 Tabela: `notifications_log`
```sql
CREATE TABLE notifications_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  type          VARCHAR(50) NOT NULL,
  payload       JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Módulos e Funcionalidades

### 5.1 Autenticação
- Cadastro com email e senha
- Login com JWT (access token + refresh token)
- Recuperação de senha por email
- Middleware de verificação de plano ativo

### 5.2 Módulo: Clientes
- CRUD completo de clientes
- Campo de observações (alergias, preferências)
- Histórico de atendimentos por cliente
- Busca por nome ou telefone

### 5.3 Módulo: Serviços
- CRUD de serviços com nome, duração e preço
- Ativar/desativar serviço
- Serviços usados nos agendamentos

### 5.4 Módulo: Agenda
- Calendário semanal e mensal
- Criar agendamento (cliente + serviço + data/hora)
- Visualizar slots disponíveis com base na duração dos serviços
- Status do agendamento: `scheduled → confirmed → completed / cancelled / no_show`
- Bloquear horários (ex: almoço, folga)

### 5.5 Módulo: Cobranças (Plano Pro)
- Gerar cobrança Pix automática ao confirmar agendamento (via Stripe)
- Enviar QR Code + Pix copia e cola para o cliente via WhatsApp
- Webhook do Stripe atualiza status para `paid` automaticamente
- Listagem de cobranças com filtro por status e período
- Relatório financeiro mensal (total recebido, pendente, cancelado)

### 5.6 Módulo: WhatsApp (uazapi)
- Lembrete automático 24h antes do agendamento
- Mensagem de confirmação após agendamento criado
- Envio do QR Code Pix quando cobrança é gerada
- Notificação de pagamento confirmado
- Fila gerenciada por BullMQ para não sobrecarregar a instância

**Limite de envio:** Máximo de 30 mensagens por hora por instância uazapi para reduzir risco de banimento.

### 5.7 Módulo: Dashboard
- Total de agendamentos da semana
- Receita do mês (recebida vs pendente)
- Próximos atendimentos do dia
- Clientes com cobrança em atraso

### 5.8 Módulo: Configurações
- Dados do profissional (nome, telefone, foto)
- Horário de atendimento (dias e horas disponíveis)
- Vincular instância WhatsApp (via uazapi)
- Gerenciar assinatura (via Stripe)

---

## 6. Integrações

### 6.1 uazapi (WhatsApp)

- Deploy self-hosted em VPS (Docker)
- Cada usuário tem uma instância própria ou compartilhada (definir na arquitetura multi-tenant)
- Endpoints utilizados:
  - `POST /instance/create` — criar instância
  - `GET /instance/connect` — obter QR Code para conectar número
  - `POST /message/sendText` — enviar mensagem de texto
  - `POST /message/sendMedia` — enviar imagem (QR Code Pix)
- Webhook recebe eventos de mensagens recebidas (futuro: resposta automatizada)

**Risco de banimento:** Documentar no onboarding que o número do profissional pode ser banido pelo WhatsApp por uso de API não oficial. Recomendar uso de número secundário.

### 6.2 Stripe (Pagamentos)

- Cada usuário pode ter Stripe Connect (conta conectada) ou usar a conta principal com metadados por tenant
- Recursos utilizados:
  - Customers — criar cliente (profissional e/ou cliente final)
  - PaymentIntents com `payment_method_types: ['pix']` — cobrança Pix (Brasil)
  - Checkout Session ou PaymentIntent para assinaturas (planos Básico/Pro)
  - Webhook `payment_intent.succeeded` — confirmar pagamento
- Taxas conforme tabela Stripe (Brasil: Pix e cartão)

---

## 7. Fluxos Principais

### 7.1 Fluxo: Novo Agendamento
```
Profissional cria agendamento
  → Sistema salva appointment (status: scheduled)
  → BullMQ agenda job: enviar confirmação WhatsApp ao cliente (imediato)
  → BullMQ agenda job: enviar lembrete WhatsApp 24h antes
  → [Plano Pro] Stripe cria cobrança Pix (PaymentIntent)
  → [Plano Pro] WhatsApp envia QR Code ao cliente
```

### 7.2 Fluxo: Pagamento Confirmado
```
Stripe recebe Pix
  → Webhook POST /api/webhooks/stripe
  → Sistema atualiza charge.status = 'paid'
  → Sistema atualiza appointment.status = 'confirmed'
  → WhatsApp envia mensagem de confirmação ao cliente
```

### 7.3 Fluxo: Lembrete Automático
```
BullMQ job dispara 24h antes do agendamento
  → Verifica se appointment ainda está scheduled/confirmed
  → uazapi envia mensagem: "Olá [nome], lembrando do seu [serviço] amanhã às [hora]!"
  → Atualiza appointment.reminder_sent = true
  → Salva log em whatsapp_messages
```

---

## 8. API REST — Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Clients
```
GET    /api/clients
POST   /api/clients
GET    /api/clients/:id
PUT    /api/clients/:id
DELETE /api/clients/:id
GET    /api/clients/:id/appointments
```

### Services
```
GET    /api/services
POST   /api/services
PUT    /api/services/:id
DELETE /api/services/:id
```

### Appointments
```
GET    /api/appointments
POST   /api/appointments
GET    /api/appointments/:id
PUT    /api/appointments/:id
PATCH  /api/appointments/:id/status
DELETE /api/appointments/:id
```

### Charges
```
GET    /api/charges
POST   /api/charges
GET    /api/charges/:id
GET    /api/charges/:id/pix
```

### Webhooks
```
POST   /api/webhooks/stripe
POST   /api/webhooks/uazapi
```

### Dashboard
```
GET    /api/dashboard/summary
GET    /api/dashboard/upcoming
GET    /api/dashboard/financial
```

### Settings
```
GET    /api/settings
PUT    /api/settings
GET    /api/whatsapp/qrcode
POST   /api/whatsapp/connect
```

---

## 9. Regras de Negócio

1. **Trial de 14 dias:** Acesso completo ao Plano Pro durante trial, sem exigir cartão
2. **Plano Básico:** Máximo de 100 clientes cadastrados
3. **Plano Pro:** Cobrança Pix e relatórios financeiros disponíveis
4. **Bloqueio de acesso:** Após vencimento sem renovação, acesso somente leitura por 7 dias, depois bloqueio total
5. **Agendamento:** Não permitir dois agendamentos sobrepostos (validar com duração do serviço)
6. **WhatsApp:** Rate limit de 30 mensagens/hora para evitar banimento
7. **Cobrança:** Só pode gerar cobrança Pix para agendamentos com status `scheduled` ou `confirmed`
8. **Cancelamento:** Ao cancelar agendamento, cobrança pendente é cancelada no Stripe automaticamente
9. **Multi-tenant:** Todos os dados são isolados por `user_id` — nenhum profissional acessa dados de outro

---

## 10. Telas (Páginas Next.js)

```
/                         → Landing page (público)
/auth/register            → Cadastro
/auth/login               → Login
/auth/forgot-password     → Recuperar senha

/app/dashboard            → Dashboard principal
/app/clients              → Lista de clientes
/app/clients/new          → Novo cliente
/app/clients/[id]         → Detalhe do cliente
/app/services             → Lista de serviços
/app/schedule             → Agenda (calendário)
/app/schedule/new         → Novo agendamento
/app/charges              → Cobranças
/app/charges/[id]         → Detalhe da cobrança
/app/settings             → Configurações
/app/settings/whatsapp    → Configurar WhatsApp
/app/settings/plan        → Gerenciar plano
```

---

## 11. Estrutura de Pastas do Projeto

```
/
├── apps/
│   ├── web/                  # Next.js 14 (frontend)
│   │   ├── app/
│   │   │   ├── (public)/     # Landing, auth
│   │   │   └── (app)/        # Área logada
│   │   ├── components/
│   │   ├── lib/
│   │   └── hooks/
│   └── api/                  # Node.js + Express/Fastify (backend)
│       ├── src/
│       │   ├── routes/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── jobs/          # BullMQ workers
│       │   ├── webhooks/
│       │   ├── integrations/
│       │   │   ├── stripe.ts
│       │   │   └── uazapi.ts
│       │   ├── middleware/
│       │   └── db/
│       │       └── prisma/
│       │           └── schema.prisma
│       └── Dockerfile
├── packages/
│   └── types/                # Tipos compartilhados
├── docker-compose.yml        # PostgreSQL + Redis local
└── .env.example
```

---

## 12. Variáveis de Ambiente

```env
# Banco
DATABASE_URL=postgresql://user:pass@localhost:5432/beleza_saas

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

# uazapi
UAZAPI_BASE_URL=http://localhost:8080   # ou URL da VPS
UAZAPI_TOKEN=

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# App
NEXT_PUBLIC_API_URL=http://localhost:3001
APP_URL=http://localhost:3000
```

---

## 13. MVP — Escopo Mínimo para Lançar

O MVP deve ser lançável em 6–8 semanas por um dev solo:

### Incluído no MVP
- [x] Autenticação (registro, login, JWT)
- [x] CRUD de clientes
- [x] CRUD de serviços
- [x] Agenda com calendário semanal
- [x] Criar e gerenciar agendamentos
- [x] Lembrete automático 24h antes via WhatsApp (uazapi)
- [x] Dashboard com resumo do dia

### Fora do MVP (fase 2)
- [ ] Cobrança automática Pix (Stripe)
- [ ] Relatórios financeiros
- [ ] Página de agendamento público (link para o cliente agendar sozinho)
- [ ] App mobile (PWA ou React Native)
- [ ] Multi-idioma

---

## 14. Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Banimento do número WhatsApp | Alta | Alertar usuário no onboarding, limitar 30 msg/hora, recomendar número secundário |
| Churn alto por preço | Média | Trial generoso de 14 dias, onboarding guiado |
| Stripe fora do ar | Baixa | Fila de retry nas cobranças, notificar usuário |
| uazapi desatualizado (WhatsApp muda protocolo) | Média | Monitorar repositório, ter plano B (Evolution API) |

---

## 15. KPIs de Sucesso

| Métrica | Meta (mês 6) | Meta (mês 18) |
|---|---|---|
| Usuários cadastrados | 500 | 3.000 |
| Clientes pagantes (MRR) | 100 | 500 |
| MRR | R$5.000 | R$35.000 |
| Churn mensal | < 5% | < 3% |
| NPS | > 40 | > 60 |

---

*PRD gerado para uso direto no Cursor. Cada seção mapeia diretamente para um módulo de implementação.*