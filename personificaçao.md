# Administração SaaS: personificação e status do usuário (ativo / inativo)

Documento de referência para reutilizar ou integrar (1) **personificação** pelo super administrador e (2) **ativação / desativação** de contas na área de administração, incluindo APIs, regras de negócio e pontos da interface.

---

## 1. Quem pode usar

- Apenas usuários com `tipo_usuario === 'super_admin'`.
- Validação no middleware `requireSuperAdmin` (`server/middleware/adminAuth.middleware.ts`).
- Durante a personificação, `req.user` representa o **usuário personificado**; o admin real é exposto em `req.originalUser` (quando o middleware `checkImpersonation` enriquece o request).

---

## 2. Onde isso aparece na interface

| Local | Arquivo | Comportamento |
|--------|---------|----------------|
| Lista de usuários (admin) | `client/src/pages/admin/users.tsx` | Ação que chama `POST /api/admin/impersonate` com `{ targetUserId }` e redireciona para `/`. |
| Dashboard admin | `client/src/pages/admin/dashboard.tsx` | Personificação recente e encerramento via `POST /api/admin/stop-impersonation`. |
| Cabeçalho admin | `client/src/components/admin/AdminStickyHeader.tsx` | Fluxo de personificar / encerrar. |
| Faixa fixa | `client/src/components/admin/ImpersonationBanner.tsx` | Aviso visual + botão “Encerrar Personificação” (`stop-impersonation`). Montado em `client/src/App.tsx`. |
| Layout / sidebar | `client/src/layouts/MainLayout.tsx`, `client/src/components/shared/Sidebar.tsx` | Ajustes quando `isImpersonating` (área admin / offset). |

---

## 3. API HTTP (sessão + cookie)

Todas as rotas abaixo usam **`credentials: 'include'`** no browser (cookie de sessão, tipicamente `connect.sid`). Ordem de middleware nas rotas admin: `combinedAuth` → `checkImpersonation` → (`requireSuperAdmin` quando aplicável).

### 3.1 Iniciar personificação

- **Método / URL:** `POST /api/admin/impersonate`
- **Body (JSON):** `{ "targetUserId": <number> }`
- **Resposta 200 (exemplo):** `{ "message", "sessionId", "targetUser": { id, nome, email, tipo_usuario } }`
- **Implementação:** `impersonateUser` em `server/controllers/admin.controller.ts`

**Regras de negócio (resumo):**

- Usuário alvo deve existir e estar **ativo** (`ativo === true`).
- Não personificar **outro** `super_admin`.
- Não personificar **a si mesmo**.

### 3.2 Encerrar personificação

- **Método / URL:** `POST /api/admin/stop-impersonation`
- **Body:** vazio (só sessão).
- **Resposta 200:** `{ "message": "Personificação encerrada com sucesso" }`
- **404:** se não houver `isImpersonating` ou `originalAdmin` na sessão.
- **Implementação:** `stopImpersonation` em `server/controllers/admin.controller.ts`

### 3.3 Status da personificação

- **Método / URL:** `GET /api/admin/impersonation-status`
- **Resposta:** `{ isImpersonating, originalAdmin, currentUser }` (senhas omitidas).
- **Implementação:** `getImpersonationStatus` em `server/controllers/admin.controller.ts`

### 3.4 Usuário atual (inclui contexto de personificação)

- **Método / URL:** `GET /api/auth/me` (ou rota equivalente exposta pelo `userController.getCurrentUser` conforme `server/routes.ts`)
- Quando a sessão está em modo personificação, a resposta inclui `isImpersonating: true` e `originalAdmin` (sem senha). Ver `getCurrentUser` em `server/controllers/user.controller.ts`.

**Swagger:** definições em `server/swagger.ts` (seções `/api/admin/impersonate`, `/api/admin/stop-impersonation`).

---

## 4. Sessão Express (`express-session`)

Campos relevantes (ver `server/types/session.types.ts`):

| Campo | Uso |
|--------|-----|
| `userId` | ID do usuário logado “normalmente” (após encerrar personificação volta para o admin). |
| `user` | Objeto resumido `{ id, email, nome, tipo_usuario }` do **personificado** enquanto `isImpersonating` é true. |
| `originalAdmin` | Snapshot do super admin antes de personificar (usado para restaurar sessão). |
| `isImpersonating` | Flag booleana. |

**Autenticação:** `server/middleware/auth.middleware.ts` — se `session.isImpersonating && session.user`, carrega o usuário personificado do banco e define `req.user`.

---

## 5. Persistência: tabela `user_sessions_admin`

Definida em `shared/schema.ts` (`userSessionsAdmin`):

| Coluna | Descrição |
|--------|-----------|
| `id` | Identificador da sessão de personificação. |
| `super_admin_id` | Quem está personificando. |
| `target_user_id` | Usuário alvo. |
| `data_inicio` / `data_fim` | Janela temporal. |
| `ativo` | Sessão ativa ou encerrada. |

**Storage:** `createImpersonationSession`, `getActiveImpersonationSession`, `endImpersonationSession` em `server/storage.ts`. Ao criar nova personificação para um alvo, sessões ativas anteriores para o mesmo `target_user_id` são encerradas.

---

## 6. Middleware de contexto

- **`checkImpersonation`** (`server/middleware/adminAuth.middleware.ts`): para o `req.user` atual (personificado), busca linha ativa em `user_sessions_admin` e preenche `req.originalUser`, `req.isImpersonating` e `impersonationContext` para controllers (ex.: perfil).
- **`requireSuperAdmin`:** usa `req.originalUser || req.user` para permitir que o super admin continue autorizado em rotas admin **enquanto** a sessão HTTP representa o cliente.

Há também um arquivo legado **`server/middleware/impersonation.middleware.ts`** com outra implementação de `checkImpersonation` / `requireSuperAdmin`; **as rotas registradas em `server/routes.ts` importam apenas `adminAuth.middleware.ts`**. Qualquer integração nova deve seguir essa importação.

---

## 7. WebSocket / notificações

- Em `server/controllers/transaction.controller.ts`, respostas podem incluir `isImpersonated` para o cliente.
- `client/src/hooks/useWebSocket.ts` trata `notification.data?.isImpersonated`.

---

## 8. Boas práticas para outra operação / produto

1. **Auditoria:** manter trilha (`user_sessions_admin` + logs já existentes nos controllers) e política de retenção.
2. **LGPD / consentimento:** documentar uso de personificação em termos e procedimento interno.
3. **Timeouts:** considerar encerramento automático de sessões antigas (`ativo` / `data_fim`).
4. **Não expor senhas:** respostas já removem `senha`; manter o padrão em novos endpoints.
5. **Testes de integração:** fluxo login super admin → `POST impersonate` → `GET /api/auth/me` → `POST stop-impersonation` → perfil volta ao admin.

---

## 9. Referência rápida de arquivos

| Área | Arquivo principal |
|------|-------------------|
| Rotas | `server/routes.ts` |
| Controller admin | `server/controllers/admin.controller.ts` |
| Middleware admin + personificação | `server/middleware/adminAuth.middleware.ts` |
| Auth sessão | `server/middleware/auth.middleware.ts` |
| Schema sessões admin | `shared/schema.ts` (`user_sessions_admin`) |
| UI lista usuários | `client/src/pages/admin/users.tsx` |
| Login (bloqueio se inativo) | `server/controllers/user.controller.ts` (`login`) |

---

## 10. Ativar e desativar usuário na administração

O cadastro de usuário possui o campo booleano **`ativo`** (tabela `usuarios`, ver `shared/schema.ts`). Quando `ativo !== true`, o **login** é recusado com mensagem genérica de credencial (`server/controllers/user.controller.ts`, após checagem de assinatura). Usuários inativos **não** podem ser personificados (`impersonateUser` valida `targetUser.ativo`).

### 10.1 Onde isso aparece na interface (`client/src/pages/admin/users.tsx`)

| Elemento | Comportamento |
|----------|----------------|
| **Abas** | Separação visual entre usuários ativos (não cancelados), cancelados e inativos (`Tabs`: valores como `active`, `canceled`, `inactive`). |
| **Interruptor (Switch)** | Em cada linha da lista, `onCheckedChange` chama `handleToggleStatus(user)`, que envia o **novo** valor `ativo: !user.ativo` via mutation otimista. |
| **Modal “Editar usuário”** | Campo “Usuário Ativo” (`Switch` ligado a `editForm.ativo`); ao salvar, `handleUpdateUser` envia o formulário completo (inclui `ativo`). |
| **Ícone de lixeira (“Desativar”)** | `handleDeleteUser` → `DELETE /api/admin/users/:id` — **soft delete**: apenas define `ativo: false` (não remove o registro, salvo fluxo `?permanente=true` no backend). |
| **UI otimista** | `toggleUserStatusMutation` atualiza o cache React Query antes da resposta e reverte em caso de erro. |

Personificação na mesma tela só é oferecida para quem **não** é `super_admin` (`user.tipo_usuario !== 'super_admin'`).

### 10.2 APIs usadas pela tela de administração

A lista de usuários hoje usa **`PUT /api/admin/users/:id`** com corpo JSON parcial, por exemplo `{ "ativo": true }` no toggle, ou o objeto completo do modal de edição (`updateUser` em `server/controllers/admin.controller.ts`).

Existe também um endpoint dedicado ao status (documentado no Swagger), que **não** é o que o `Switch` da lista chama atualmente:

| Método | URL | Body | Controller |
|--------|-----|------|------------|
| `PUT` | `/api/admin/users/:id` | Objeto com campos a atualizar (ex.: `{ "ativo": false }` ou edição completa). | `updateUser` |
| `PATCH` | `/api/admin/users/:id/status` | `{ "ativo": boolean }` **obrigatório**. | `updateUserStatus` |

**Middleware:** mesma cadeia das demais rotas admin — `combinedAuth` → `checkImpersonation` → `requireSuperAdmin` (ver `server/routes.ts`).

### 10.3 Regras importantes no backend

**`updateUserStatus` (`PATCH …/status`)**

- `ativo` precisa ser estritamente booleano; caso contrário **400**.
- **Não** permite desativar usuário com `tipo_usuario === 'super_admin'` (**403**).
- Se `ativo === true` e o usuário estava com assinatura cancelada (`status_assinatura === 'cancelada'` ou `data_cancelamento` preenchida), o controller **reabre** a assinatura: `status_assinatura = 'ativa'`, zera `data_cancelamento` e `motivo_cancelamento`.
- Quando um **super_admin** **reativa** um usuário que estava inativo (`ativo` de `false` para `true`), o código dispara fluxo extra: gera **nova senha aleatória** (8 caracteres alfanuméricos), persiste o hash, monta payload `usuario_ativado` e chama o webhook em `process.env.WEBHOOK_ATIVACAO_URL` (fallback hardcoded no código se a env não existir). A mensagem pode vir da tabela `welcome_messages` com `type = 'activated'`.

**`updateUser` (`PUT …/users/:id`)**

- Bloqueia desativar **a própria** conta do admin logado (`userId === req.user.id` e `ativo === false` → **400**).
- Mesma lógica de **limpar cancelamento** ao ativar (`ativo === true` com assinatura cancelada) e o mesmo **webhook + nova senha** quando super_admin reativa usuário inativo (condição `req.body.ativo === true && existingUser.ativo === false && req.user?.tipo_usuario === 'super_admin'`).
- **Observação de consistência:** só `updateUserStatus` impede explicitamente desativar outro **super_admin**; o `PUT` genérico não contém essa mesma checagem. Integrações novas podem preferir `PATCH …/status` para alteração exclusiva de flag `ativo`.

**`deleteUser` (`DELETE …/users/:id`)**

- Por padrão apenas `ativo: false` (soft delete). Com query `?permanente=true`, executa exclusão em cascata (`storage.deleteUserCascade`).

### 10.4 Relação com personificação e suporte

- Só é possível iniciar personificação se o alvo estiver **ativo**.
- Métricas de “usuários inativos” no dashboard admin usam `ativo` e cancelamento (`server/controllers/admin.controller.ts` / `analytics.controller.ts`).

### 10.5 Personalização de mensagem de ativação

- Textos para conta reativada podem ser configurados na área de customização (`client/src/pages/admin/customize.tsx` descreve mensagem quando super admin ativa manualmente usuário inativo).
- O webhook inclui `acesso_web.usuario` / `acesso_web.senha` (senha recém-gerada) e bloco `mensagem_ativacao` para automações externas (e-mail, WhatsApp, etc.).

---

*Documento gerado com base no código do repositório **financehub** (branch de trabalho local). Ajuste URLs base (`/api`) se o deploy usar prefixo ou gateway.*
