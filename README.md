# NAPI Águas

Plataforma web de visualização geoespacial de indicadores de vulnerabilidade climática para o estado do Paraná. Reúne dados dos quatro Grupos de Trabalho do NAPI Águas (Água Doce, Litoral, Saúde e Infraestrutura de Transportes) em mapas interativos.

## Stack

- **Frontend:** React 19, Vite 7, TypeScript, MapLibre GL JS, Tailwind, Zustand, React Router.
- **Backend:** Node.js 20, Fastify 4, Drizzle ORM, PostgreSQL 16 + PostGIS 3.4, GDAL.
- **Infra:** Docker, docker-compose, NGINX (produção).
- **Monorepo:** PNPM workspaces.

## Estrutura

```
.
├── apps/
│   ├── api/                # backend Fastify + Drizzle
│   └── web/                # frontend React + Vite
├── packages/
│   ├── shared/             # tipos, schemas Zod e validadores compartilhados
│   └── ui/                 # componentes de UI compartilhados
├── infrastructure/
│   └── docker/             # Dockerfiles e docker-compose (dev e prod)
├── deploy-files/           # Dockerfiles, entrypoints e script de build das imagens
├── docs/                   # Documentos
├── scripts/                # scripts auxiliares de build e deploy
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## Pré-requisitos

- Node.js 20 LTS
- PNPM 9 (`npm install -g pnpm@9`)
- Docker 24+ e Docker Compose 2.23+

## Instalação

```bash
pnpm install
```

Copie os arquivos de exemplo de ambiente e ajuste os valores:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

## Desenvolvimento

Sobe PostgreSQL + API em Docker e o frontend em modo dev (hot reload) em paralelo:

```bash
pnpm dev
```

Alternativas:

```bash
pnpm dev:docker     # apenas a stack docker (PostgreSQL + API)
pnpm dev:web        # apenas o frontend
pnpm docker:clean   # derruba containers e volumes de dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

## Banco de dados

```bash
pnpm db:migrate                                      # aplica migrations pendentes
pnpm db:seed                                         # popula todos os GTs com dados base
pnpm --filter @napi-aguas/api db:seed:admin          # cria usuário admin
pnpm --filter @napi-aguas/api db:create-user         # cria usuário customizado
pnpm --filter @napi-aguas/api db:clean               # limpa tabelas de domínio
pnpm --filter @napi-aguas/api db:reset               # drop/recriar schema
```

## Lint e formatação

```bash
pnpm lint
pnpm format
pnpm format:write
```

## Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `DATABASE_URL` | api | string de conexão PostgreSQL/PostGIS |
| `API_PORT` | api | porta do servidor Fastify (padrão 3000) |
| `CORS_ORIGIN` | api | origem autorizada para CORS |
| `JWT_SECRET` | api | segredo para assinatura de tokens JWT |
| `JWT_ACCESS_EXPIRY` | api | validade do access token (ex.: `1h`) |
| `JWT_REFRESH_EXPIRY` | api | validade do refresh token (ex.: `7d`) |
| `BCRYPT_SALT_ROUNDS` | api | custo do bcrypt para hashing de senhas |
| `VITE_API_BASE_URL` | web | URL base da API consumida pelo frontend |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | docker | credenciais do container de banco |

Os arquivos `.env.example`, `.env.prod.example`, `apps/api/.env.example` e `apps/web/.env.example` listam todas as variáveis suportadas.

## Grupos de Trabalho

Cada GT possui visualização específica e navegação hierárquica de índice → subíndice → indicador.

- **Água Doce** — polígonos de subbacias nível 10 e gráficos de barras por comitê.
- **Litoral** — polígonos dos 7 municípios litorâneos.
- **Saúde** — polígonos dos 399 municípios do Paraná.
- **Transportes** — linhas de trechos rodoviários estaduais e federais.
