# Beleza Pro — Design System « Rose Slate »

Referência rápida para novas telas. Tokens no `tailwind.config.ts` e componentes em `components/ui` + `components/layout`.

## Cores (Tailwind)

| Token | Uso |
|--------|-----|
| `primary`, `primary-hover`, `primary-light`, `primary-muted` | CTAs, foco, badges rosa |
| `sidebar-bg`, `sidebar-active`, `sidebar-border` | Sidebar escura |
| `app-bg`, `app-surface` | Fundo da área logada e cards |
| `border`, `border-focus` | Bordas e foco de input |
| `ink-primary`, `ink-secondary`, `ink-muted` | Textos |
| `success` / `success-light`, `warning` / `warning-light`, `danger` / `danger-light` | Status e erros |

## Componentes base

- **Sidebar** — `components/layout/Sidebar.tsx` (248px, logout no rodapé)
- **Header** — `components/layout/Header.tsx` (60px, props `breadcrumb` opcional)
- **Button** — variantes: `primary`, `secondary`, `outline`, `ghost`, `danger-ghost`
- **Card** — `interactive` opcional para hover de card clicável
- **Badge** — status de agenda e cobranças alinhados ao PRD
- **Input** — label + erro padrão
- **Modal** — overlay + superfície branca

## Conteúdo das páginas

- Área principal: `bg-app-bg`, conteúdo com `max-w-content` (1280px) + `mx-auto` + `px-8` quando fizer sentido.
- Tipografia: títulos de página preferir `text-page-title` ou `text-header-title` no header.

## Inter

Carregada em `app/globals.css` (Google Fonts). Corpo: `text-sm` + `text-ink-secondary` no `body` (base layer).
