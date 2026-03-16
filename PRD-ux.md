# PRD: Beleza Pro - SaaS de Gestão para Profissionais de Beleza

## 1. Visão Geral do Produto
O **Beleza Pro** é um SaaS de gestão focado em profissionais de beleza autônomos no Brasil. O objetivo é simplificar a gestão de agenda, clientes, cobranças e serviços, oferecendo uma experiência Web App moderna e eficiente.

## 2. Design System

### 2.1 Identidade Visual
Limpa, profissional e acolhedora. Focada em simplicidade para usuários autônomos.

### 2.2 Paleta de Cores
- **Primária:** #7C3AED (violet-600) — Botões, estados ativos, destaques.
- **Primária Clara:** #EDE9FE (violet-100) — Fundos de badges, hovers.
- **Sucesso:** #059669 (emerald-600) — Pagamentos recebidos, confirmados.
- **Alerta:** #D97706 (amber-600) — Pendentes, avisos.
- **Perigo:** #DC2626 (red-600) — Inadimplentes, cancelamentos.
- **Sidebar:** #1E1B4B (indigo-950) — Sidebar escura com texto claro.
- **Fundo Geral:** #F9FAFB (gray-50).

### 2.3 Tipografia
- **Família:** Inter (sans-serif).
- **Escala:** Títulos 24px (Bold), Seções 18px (Semibold), Corpo 14px (Regular).

### 2.4 Layout & Componentes
- **Estrutura:** Sidebar fixa (240px) à esquerda + Área de conteúdo principal.
- **Cards:** Border radius 12px, borda cinza sutil (#E5E7EB), fundo branco.
- **Botões:** Border radius 8px. Primário (Violeta), Secundário (Branco/Borda), Ghost (Texto violeta).

---

## 3. Escopo das Telas (UX/UI)

### T1: Login / Autenticação
- **Layout:** Dividido 50/50. Painel visual à esquerda com branding; formulário à direita.
- **Funcionalidades:** E-mail/senha, "Lembrar de mim", "Esqueci senha", login social (Google).

### T2: Dashboard (Início)
- **Métricas:** 4 cards no topo (Agendamentos Hoje, Receita Mês, Pendentes, Clientes Ativos).
- **Agenda do Dia:** Lista cronológica (60% largura) com status coloridos e botão WhatsApp.
- **Financeiro:** Gráfico de rosca (40% largura) de Recebidos vs Pendentes.
- **Ações Rápidas:** Novo Agendamento, Nova Cliente, Enviar Lembrete.

### T3: Lista de Clientes
- **Busca/Filtros:** Input de busca por nome/celular + Filtros (Todas, Ativas, Novas).
- **Tabela:** Avatar, Nome (Bold), Telefone (Link WhatsApp), Último Atendimento, Status (Badge).

### T4: Nova Cliente / Cadastro
- **Campos:** Nome, Telefone (Máscara BR), E-mail, Observações (Textarea).
- **Fluxo:** Toggle opcional para agendar o primeiro horário simultaneamente ao cadastro.

### T5: Agenda (Visualização Semanal)
- **Layout:** Grid semanal (Seg-Dom) com horários das 08:00 às 20:00.
- **Interação:** Blocos coloridos por status. Barra lateral com mini calendário.
- **Bloqueios:** Slots de almoço marcados visualmente.

### T6: Novo Agendamento
- **Fluxo:** Seleção de cliente (autocomplete) -> Serviço (cards de rádio) -> Data/Hora (grid de slots).
- **Resumo:** Painel lateral fixo com o valor total e detalhes antes de confirmar.

### T7: Cobranças (Financeiro)
- **Métricas:** Cards coloridos de Recebido, Pendente e Inadimplente.
- **Gestão:** Abas de status + Tabela com botão "Copiar Pix" e status de vencimento.

### T8: Serviços
- **Gestão:** Cards com Nome, Preço, Duração e estatística de uso.
- **Controle:** Toggle rápido para ativar/desativar serviços.

### T9: Configurações
- **Seções:** Perfil (Dados Pessoais), Horários (configuração dia a dia), WhatsApp (Integração via QR Code).

---

## 4. Localização & Regras
- **Idioma:** Português do Brasil (PT-BR).
- **Moeda:** Real (R$ 0,00).
- **Datas:** Formato DD/MM/AAAA.
- **Comunicação:** Foco total em integração nativa com WhatsApp para lembretes.

---
*Este PRD foi gerado pelo Stitch para servir de base técnica no Cursor.*