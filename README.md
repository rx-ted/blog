# @app/web-blog

Public-facing blog frontend with full-text search, markdown editing, comments, i18n, and theme customization. Built with Vue 3.

## Tech Stack

- **Framework:** Vue 3 (Composition API)
- **UI Library:** Naive UI
- **State:** Pinia
- **Markdown:** markdown-it, marked, md-editor-v3
- **Search:** Highlight.js-powered client-side search
- **Icons:** Iconify
- **Build:** Vite + TypeScript

## Structure

```
src/
├── App.vue                    Root component
├── layouts/                   App and page layouts
│   ├── app/                   Main layout (header, footer, floating widgets)
│   └── fullwidth/             Full-width page layout
├── pages/                     Route pages
│   ├── HomePage               Blog home with article list
│   ├── PostDetailPage         Article reader
│   ├── EditorPage             Markdown editor
│   ├── SearchPage             Full-text search
│   ├── AuthorPage             Author profile
│   ├── LoginPage              User login
│   ├── RegisterPage           User registration
│   └── ...
├── components/                Reusable UI components
│   ├── blog/                  Article cards, lists
│   ├── comment/               Comment threads (Giscus integration)
│   ├── editors/               Blog editor with save dialog
│   ├── search/                Search result cards
│   ├── users/                 User cards, login, register
│   ├── seo/                   SEO head management
│   └── ui/                    Error boundary, lazy image, etc.
├── stores/                    Pinia stores
├── composables/               useI18n, useSearch, useTheme, useToc, etc.
├── router/                    Vue Router configuration
├── theme/                     Theming system (tokens, layout, floating)
└── i18n/                      Internationalization messages
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Build for production |
| `pnpm test` | Run tests |

## Features

- Full-text search with highlight
- Markdown editor for articles
- Comment system with Giscus integration
- Internationalization (i18n)
- Dark/light theme with customization
- Responsive design with mobile navigation
- SEO head management
- User authentication (login, register, profile)
