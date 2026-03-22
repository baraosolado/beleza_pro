## Visão geral do que já existe

- **Posicionamento**: SaaS focado em profissionais de beleza/autônomos no Brasil (manicure, cabelo, estética), com cobrança Pix via Stripe e automações via n8n/WhatsApp.
- **Stack**: Next.js 14 (App Router), React, Tailwind, React Query; backend Node + Fastify + Prisma + PostgreSQL; Auth com JWT; filas com BullMQ + Redis; integrações Stripe e uazapi/n8n.

### Funcionalidades atuais (produtivas)

- **Autenticação e conta**
  - Cadastro, login, refresh token, recuperação e reset de senha.
  - Plano do usuário salvo (trial/basic/pro), já usado na UI de plano.

- **Agenda**
  - Tela de **Dashboard** com:
    - Agendamentos de hoje.
    - Receita do mês, valores pendentes e inadimplentes.
    - Clientes ativos.
    - Donut de resumo financeiro do mês.
  - Tela de **Agenda**:
    - Listagem por dia, com detalhes do agendamento.
    - Estados: agendado, confirmado, concluído, cancelado.
    - Tela de novo agendamento, com seleção de cliente e serviço.
    - Tela de edição de agendamento.

- **Clientes**
  - Listagem de clientes com busca.
  - Cadastro de novo cliente.
  - Tela de detalhes com:
    - Dados básicos (nome, telefone, e-mail).
    - Histórico de agendamentos/cobranças.
    - Total gasto e métricas simples.

- **Serviços**
  - CRUD de serviços (nome, duração em minutos, preço, ativo/inativo).

- **Cobranças e financeiro**
  - Tabela de cobranças com:
    - Valor, status (pendente/pago/cancelado), data de vencimento.
    - Ligação com agendamento e cliente.
  - Criação de cobrança a partir de agendamento.
  - Atualização de status (incluindo marcação como paga, ajustando `paidAt`).
  - Integração com Stripe:
    - Geração de Pix (qrcode/copy-paste) e PaymentIntent/link de pagamento.
  - Resumo financeiro:
    - Dashboard mostra recebido no mês, pendente e inadimplente.
    - Página de cobranças mostra resumo do período.

- **Enviar Conta / Fatura**
  - Tela específica de **Enviar Conta**:
    - Busca e seleção de cliente.
    - Lista de cobranças em aberto da cliente.
    - Seleção múltipla, subtotal em tempo real.
  - Integração com **n8n**:
    - Webhook de **preview** (`N8N_INVOICE_PREVIEW_WEBHOOK_URL`) recebe um JSON rico com:
      - Dados da cliente.
      - Lista de serviços/itens, valores, datas.
      - Dados do negócio (nome do estúdio, contatos, Pix, endereço, Instagram).
    - Resposta pode ser `pdfUrl` ou `pdfBase64`.
  - UI:
    - Botão **“Gerar PDF”**: dispara só o webhook de preview e mostra o PDF no iframe.
    - Botão **“Apenas Baixar PDF”**: chama preview e baixa o arquivo.
    - Botão **“Enviar WhatsApp”**: chama **apenas** o webhook de envio (`N8N_INVOICE_SEND_WEBHOOK_URL`), com o mesmo JSON do preview.

- **Configurações**
  - **Perfil / Dados Pessoais**
    - Nome, telefone, e-mail (somente leitura), senha.
    - Avatar com iniciais e indicação de plano.
    - “Membro desde mês/ano”.
  - **Dados do Negócio**
    - Nome do estúdio.
    - Categoria (Manicure & Estética, Cabelo & Barba, etc.).
    - Instagram.
    - E-mail do negócio.
    - Telefone do negócio.
    - Chave Pix.
    - Endereço profissional.
    - Tudo persistido em colunas próprias no `User` e usado no payload dos webhooks.
  - **Horários de Atendimento**
    - Para cada dia da semana:
      - Toggle aberto/fechado.
      - Horários de início/fim (uma faixa principal).
      - UI preparada para “Adicionar Intervalo” (ainda sem persistência de múltiplos intervalos).
  - **WhatsApp**
    - Integração via uazapi (instância por usuário).
    - Obtenção de QRCode para conectar.
    - Canal pronto para ser usado junto com n8n (envio das mensagens).
  - **Plano e faturamento (UI)**
    - Card de plano atual (trial/basic/pro) com preço e descrição.
    - Secção mockada de formas de pagamento e histórico de faturas (ainda não integrado a billing real).

---

## Gaps em relação a concorrentes fortes

### 1. Multi-profissional / equipe

**Hoje:**
- Modelo todo baseado em um único `User` (dono).
- Agendamentos, serviços e cobranças sempre ligados ao usuário único.

**Concorrentes oferecem:**
- Cadastro de **profissionais** (colaboradores) com agenda própria.
- Visualização da agenda por profissional (colunas) e filtros.
- Perfis de acesso (admin, recepção, profissional).
- Relatórios por profissional (produção, comissão, taxa de ocupação).

**Próximos passos:**
- Criar modelo `Professional` associado ao `User`.
- Ajustar agendamentos para referenciar um `professionalId`.
- Tela de agenda multi-coluna (por profissional).
- Permissões básicas (ex.: profissional só vê sua agenda e clientes).

### 2. Agendamento online e experiência da cliente final

**Hoje:**
- Foco 100% no painel interno; não há fluxo de agendamento pela cliente.
- WhatsApp é usado para enviar fatura/conta, não ainda para booking.

**Concorrentes oferecem:**
- Link público do estúdio para agendamento online.
- Página pública com serviços, horários disponíveis e botão de agendar.
- Confirmações automáticas, lembretes e pós-atendimento.

**Próximos passos:**
- Criar rota pública (ex.: `/s/[slug-do-estudio]`) com:
  - Nome, foto/logo, serviços principais, endereço, Instagram.
  - Botão “Agendar pelo WhatsApp” (primeira versão simples).
- Evoluir para:
  - Seleção de serviço + profissional + horário em uma UI pública.
  - Criação de agendamento já associado ao cliente existente ou novo.

### 3. Relatórios e financeiro avançado

**Hoje:**
- Resumo de receita do mês, pendências e inadimplência.
- Cobranças ligadas a agendamentos; `paidAt` e `dueDate` usados nos cálculos.

**Concorrentes oferecem:**
- Relatórios detalhados:
  - Faturamento por período, por serviço, por profissional.
  - Ticket médio, retorno de clientes, frequência média.
  - Comparação de períodos (mês vs. mês anterior, ano vs. ano).

**Próximos passos:**
- Criar endpoints e telas de relatório:
  - Faturamento por serviço.
  - Faturamento por cliente.
  - Faturamento por profissional (depois de implementar multi-profissional).
- Implementar exportação para CSV/Excel.

### 4. Automação de marketing e relacionamento

**Hoje:**
- Integração com WhatsApp + n8n permite automações, mas nada pronto na UI.

**Concorrentes oferecem:**
- Lembrete automático de agendamento (24h/48h antes).
- Mensagens de aniversário.
- Reativação de clientes inativos (ex.: 60 dias sem voltar).
- Campanhas segmentadas (clientes VIP, clientes de um serviço específico).

**Próximos passos:**
- Criar configurações de lembretes:
  - “Enviar lembrete via WhatsApp X horas antes”.
  - Usar n8n + webhooks + jobs para disparar automaticamente.
- Expor templates básicos de mensagem (editáveis no painel).
- Primeiro conjunto de automações:
  - Lembrete de agendamento.
  - Mensagem de pós-atendimento pedindo feedback/avaliação.
  - Mensagem de “sentimos sua falta” depois de X dias.

### 5. Estoque e venda de produtos

**Hoje:**
- Focado em serviços; não há controle de produtos/estoque.

**Concorrentes oferecem:**
- Cadastro de produtos, estoque mínimo, alerta de reposição.
- Vendas de produtos atreladas aos atendimentos.

**Próximos passos:**
- Criar models básicos de produto e estoque.
- UI simples para registrar venda de produto junto ao atendimento.
- Relatório de giro de estoque e margem por produto.

### 6. Múltiplas unidades / filiais (escala SaaS)

**Hoje:**
- Cada `User` representa um negócio isolado.

**Concorrentes maiores oferecem:**
- Conta “master” com várias unidades/filiais.
- Visão consolidada de faturamento e agenda.

**Próximos passos:**
- Planejar um modelo `Account` (tenant) com vários `User`/`Professional`.
- Definir estratégia de planos por número de profissionais ou unidades.

### 7. Onboarding e auto-serviço

**Hoje:**
- Setup é funcional, mas não guiado (README + telas).

**Concorrentes oferecem:**
- Tour guiado no primeiro login.
- Checklists de “primeiros passos”.

**Próximos passos:**
- Criar um fluxo de onboarding dentro do app:
  - 1) Cadastrar serviços principais.
  - 2) Configurar horários.
  - 3) Cadastrar primeira cliente.
  - 4) Conectar WhatsApp/Stripe.
- Checklist visível no dashboard até concluir.

---

## Roadmap sugerido (alto nível)

### Fase 1 – Conversão e redução de churn (curto prazo)

- Finalizar experiência de **Enviar Conta + WhatsApp** (estável, sem bugs).
- Refino das telas:
  - Perfil / Dados do negócio (já quase pronto).
  - Horários de atendimento (guardar múltiplos intervalos ou clarificar que é 1 por dia).
- Lembrete básico de agendamento via WhatsApp (usando n8n).

### Fase 2 – Crescimento de uso diário

- Multi-profissional simples.
- Agenda por profissional.
- Relatórios básicos por serviço/cliente.
- Página pública do estúdio com botão “Agendar pelo WhatsApp”.

### Fase 3 – Escala e diferenciação

- Automação de marketing (aniversário, reativação).
- Relatórios avançados (coorte, ticket, comparativos).
- Produtos/estoque.
- Multiplas unidades (quando fizer sentido para clientes maiores).

Esse arquivo é um guia vivo: conforme novas features forem entrando, é só ajustar as fases e marcar o que já foi entregue.

