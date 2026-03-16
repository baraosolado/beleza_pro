# Beleza Pro — AGENTS.md

Leia este arquivo antes de qualquer tarefa de médio/longo prazo.

## O que é o Beleza Pro
SaaS de gestão para profissionais de beleza autônomos no Brasil (manicures,
cabeleireiros, esteticistas). Permite gerenciar clientes, agenda e cobranças
com lembretes automáticos pelo WhatsApp e cobrança Pix automática.

## Stack completa
| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 — App Router, RSC, Tailwind CSS |
| Backend | Node.js + Fastify |
| Banco | PostgreSQL via Prisma ORM |
| WhatsApp | uazapi self-hosted (gratuito, baseado em Baileys) |
| Pagamentos | Stripe (Pix, cartão, assinaturas) |
| Fila | BullMQ + Redis |
| Auth | JWT (access 15min + refresh 7d) |

## Modelos de dados principais
- `users` — profissional autônomo (dono da conta)
- `clients` — clientes da profissional
- `services` — serviços oferecidos (nome, duração, preço)
- `appointments` — agendamentos (cliente + serviço + data/hora + status)
- `charges` — cobranças Pix vinculadas a agendamentos
- `whatsapp_messages` — log de mensagens enviadas via uazapi

## Fluxos críticos (não quebrar)

### 1. Novo agendamento
appointment criado → confirmar WhatsApp → agendar lembrete 24h → [Pro] gerar Pix no Stripe → [Pro] enviar QR Code WhatsApp

### 2. Pagamento recebido
Stripe dispara webhook → atualizar charge.status='paid' → atualizar appointment.status='confirmed' → WhatsApp confirma para cliente

### 3. Lembrete automático
BullMQ job dispara 24h antes → verificar se appointment ainda ativo → uazapi envia mensagem → atualizar reminder_sent=true

## Regras que NUNCA podem ser violadas
1. Todo dado isolado por `userId` — sem exceção
2. uazapi: máx 30 mensagens/hora (risco de banimento do WhatsApp)
3. Stripe webhook: processar com idempotência
4. Senha sempre com Argon2
5. Zero secrets hardcodados

## Arquivos que NÃO pode alterar sem discussão
- `apps/api/src/db/prisma/schema.prisma` — impacta migrations
- `apps/api/src/integrations/stripe.ts` — lógica financeira crítica
- `apps/api/src/jobs/whatsapp.job.ts` — rate limiter do uazapi

## Variáveis de ambiente necessárias
Ver `.env.example` na raiz do projeto.