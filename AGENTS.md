# SNER Project Digest

SNER (slow network recon) is a monorepo for distributed network reconnaissance and long-term IP-centric data management. It consists of a Python Flask server, a React TypeScript frontend, and a plugin-based Python agent.

## Repository Layout

```
/opt/sner
├── server/                 # Python backend + agent + plugins
│   ├── sner/
│   │   ├── server/         # Flask app, blueprints, models, API
│   │   ├── agent/          # Agent runtime and module base
│   │   └── plugin/         # Agent/parser plugins (nmap, nuclei, nessus, ...)
│   ├── tests/              # pytest tests (agent, plugin, server, selenium)
│   ├── migrations/         # Alembic/Flask-Migrate DB migrations
│   ├── bin/                # `server`, `agent` entrypoint scripts
│   └── scripts/            # Utility scripts
├── frontend/               # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── routes/         # react-router page components
│   │   ├── components/     # Reusable UI components
│   │   ├── lib/            # HTTP client, URL helpers, DataTables wrapper
│   │   ├── atoms/          # Recoil global state
│   │   └── tests/          # Vitest + MSW tests
│   └── vite.config.ts
├── docker/                 # Docker Compose + Dockerfiles for server/agent/db
└── .github/workflows/      # GitHub Actions CI
```

## Backend Patterns (Python / Flask)

- **App factory**: `sner.server.app:create_app()` initializes Flask, loads YAML/env config, registers blueprints, and wires extensions.
- **Extensions** are declared in `sner.server.extensions` and initialized via `init_app`: SQLAlchemy, Flask-Migrate, Flask-Login, Flask-Session, Flask-Smorest (OpenAPI), Flask-WTF CSRF, CORS, OAuth, WebAuthn.
- **Configuration**: layered defaults → `/etc/sner.yaml` → `SNER_CONFIG` env var. Planner config also lives under the `planner:` key.
- **Blueprints** by subsystem: `auth`, `scheduler`, `storage`, `visuals`, `lens`, plus `api` (flask-smorest) and `frontend`.
- **CLI**: Flask subcommands grouped per subsystem (`auth`, `scheduler`, `storage`, `planner`, `dbx`, `psql`, `nessus`).
- **Models**: SQLAlchemy declarative base via `db.Model`. PostgreSQL-specific types (`INET`, `ARRAY`). Shared base with `update()` merge helper.
- **Auth**: session-based web auth (password + TOTP + WebAuthn + OIDC) and API-key auth (`X-API-KEY`) for agents/API users. Decorators: `session_required(role)`, `apikey_required(role)`.
- **Views**: mix of server-rendered Flask routes (DataTables JSON endpoints) and flask-smorest REST routes under `/api/v2`.
- **Schemas**: Marshmallow schemas in `sner.server.api.schema`.
- **Filtering**: backend parses JSON query-builder rules (`sqlafilter`, `filter_query`) for DataTables server-side filtering.
- **CSRF**: Cookie `tokencsrf` injected on non-API responses; API blueprint is CSRF-exempt.

## Frontend Patterns (React / TypeScript / Vite)

- **Build tool**: Vite with `@vitejs/plugin-react-swc`, dev server on port `18080`, proxies `/backend` and `/api` to Flask.
- **Routing**: `react-router-dom` v6 declarative route tree in `src/routes/index.tsx`. `ProtectedRoute` guards by role (`user`, `operator`, `admin`).
- **State**: Recoil atoms for app config (`appConfigState`) and current user (`userState`).
- **Boot flow**: `App.tsx` fetches `/backend/frontend_config` and `/backend/auth/user/me` before rendering the router.
- **API client**: Axios wrapper `src/lib/httpClient.ts` handles CSRF cookie/header (`tokencsrf` / `X-CSRF-TOKEN`) and toast error notifications.
- **DataTables**: `src/components/DataTable.tsx` wraps `datatables.net-bs4` for server-side paging/sorting with state persisted in `sessionStorage` per path+query. Cell rendering uses React portals.
- **Filtering**: `react-querybuilder` via `RBQFilter.tsx`; rules are serialized to URL params and reloaded by tables.
- **Styling**: Bootstrap 4 + custom SCSS/CSS; FontAwesome icons.
- **Testing**: Vitest + jsdom + Testing Library + MSW for backend mocks. 100% coverage thresholds configured.

## Agent / Plugin Patterns

- **Agent**: `sner.agent.core.AgentBase` polls `/api/v2/scheduler/job/assign`, executes a plugin module in a subprocess, and POSTs output back to `/api/v2/scheduler/job/output`.
- **Module discovery**: `sner.agent.modules.load_agent_plugins()` auto-discovers every `sner/plugin/<name>/agent.py` and registers its `AgentModule` class.
- **Parser discovery**: `sner.server.parser.load_parser_plugins()` mirrors this for `sner/plugin/<name>/parser.py`.
- **Module base**: `ModuleBase` provides config validation (Pydantic `ConfigBase`), target enumeration via `TargetManager`, subprocess execution helpers, and termination handling.
- **Parser base**: `ParserBase.parse_path(path)` returns a `ParsedItemsDb` of hosts, services, vulns, notes. Supports raw output or `.zip` archives produced by agents. Upsert semantics are keyed by address/proto/port/via_target/xtype/name.
- **Plugins**: one directory per tool (e.g. `nmap`, `nuclei`, `nessus`, `jarm`) containing `agent.py` and `parser.py`. Some plugins share a `core.py`.

## Data Flow

1. Targets are enqueued into scheduler queues.
2. Agents request assignments, run the configured module, and return zipped output.
3. Server parses output into `ParsedItemsDb` and upserts into storage (host/service/vuln/note).
4. Web UI / API queries storage; visualizations and reports are derived from the same models.

## Testing & Quality

- **Server**: pytest + factory_boy fixtures + temporary PostgreSQL DB. `make coverage` enforces 100% line coverage. Lint: flake8 + pylint.
- **Frontend**: Vitest with MSW, ESLint, Prettier, TypeScript strict checking, 100% coverage thresholds.
- **CI**: GitHub Actions run frontend build/test/lint, server coverage/lint, and optionally Selenium + Semgrep on main/devel/release branches.

## Deployment

- **Docker Compose**: `docker/docker-compose.yaml` brings up PostgreSQL, Flask server (`sner_server` image), planner (`sner_server` reused), and agent (`sner_agent` image).
- **Ports**: 18000 dev Flask, 18001 prod gunicorn, 18002 test Flask, 18080 Vite dev, 18082 Vite test.
- **Prod install**: `make install` installs server deps and external scanners (nmap, nmap scripts, ipv6toolkit, jarm, nuclei, auror testssl).

## Key Conventions

- Use `urlFor()` in frontend for backend paths; proxy resolves `/backend` and `/api` during dev.
- Role hierarchy: `admin` > `operator` > `user`; `agent` is for API access only.
- Tags are string arrays on models; `i:*` tags are ignored during vuln grouping.
- `via_target` disambiguates host/web-vhost data on the same IP.
- Modules and parsers must live in `sner/plugin/<name>/` with matching class names.
