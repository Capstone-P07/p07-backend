# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Project-wide context lives in `../../CLAUDE.md` (parent workspace). This file covers **backend-specific** details only.

## Stack

NestJS 11 + TypeScript 5.7, TypeORM 0.3.28 on PostgreSQL, ioredis for Redis, JWT auth (`@nestjs/jwt` + `passport-jwt`), bcrypt for password hashing, class-validator for DTO validation.

## Scripts (`package.json`)

| Command | Purpose |
|---------|---------|
| `npm run start:dev` | Watch mode dev server |
| `npm run start:prod` | Runs `dist/main` (build first) |
| `npm run build` | NestJS compile |
| `npm test` | Jest unit (`*.spec.ts`, rootDir `src`) |
| `npm run test:e2e` | E2E (`*.e2e-spec.ts`, config `test/jest-e2e.json`) |
| `npm run test:cov` | Coverage report |
| `npm run lint` / `npm run format` | ESLint / Prettier |

Run a single test: `npm test -- auth.service.spec.ts` or `npm test -- -t "pattern"`.

## Module Architecture

5 feature modules under `src/`, all registered in `app.module.ts`:

| Module | State | Responsibility |
|--------|-------|----------------|
| `auth/` | **Implemented** | signup, login, getMe, changePassword. JWT strategy + guard. |
| `docs/` | **Partially implemented** | `POST /docs` (Markdown 업로드), `GET /docs`, `GET /docs/:id`, `GET /docs/:id/chunks`. 파서(marked 기반) + 경계 인식 청커 + mecab-ko 트리거 연동. URL ingest 는 501 NotImplemented. |
| `chat/`, `search/`, `admin/` | **Stubs** | Controllers/services skeletal, entities defined |

**Entity locations:** each module owns `entities/*.entity.ts`. TypeORM auto-globs via `__dirname + '/**/*.entity{.ts,.js}'` in `app.module.ts:18-22`.

**Key entities** (match `../../docs/P07_ERD_schema_clean.sql`):
- `auth/entities/user.entity.ts`
- `chat/entities/session.entity.ts`, `chat-log.entity.ts`
- `docs/entities/document.entity.ts`, `doc-chunk.entity.ts` (has `fts_vector TSVECTOR`)
- `admin/entities/unanswered-question.entity.ts`

## Database

**TypeORM config** in `app.module.ts:15-24` uses `synchronize: true` — schema auto-syncs from entities in dev. `p07-infra/init.sql` 가 스키마/인덱스/FTS 트리거의 캐노니컬 소스.

### `doc_chunks` 는 synchronize 제외

`DocChunk` 엔티티는 `@Entity('doc_chunks', { synchronize: false })` 로 선언되어 있다. 이유:

- `fts_vector TSVECTOR` 컬럼, `idx_doc_chunks_fts_vector` **GIN** 인덱스, 그리고 mecab-ko 기반 트리거 `doc_chunks_fts_update` 는 `USING GIN` / `tsvector_update_trigger` 같은 TypeORM 이 이해 못 하는 DB 구조.
- 동기화에 맡기면 GIN 인덱스가 drop 되고 BTREE 로 재생성 시도되어 FTS 성능이 무너진다 (실제 발생 확인됨).

이 테이블의 스키마 변경은 **오직 `p07-infra/init.sql` 에서만** 한다. 엔티티는 read-only 뷰로 간주.

Parent `docs/P07_ERD_schema_clean.sql` is the canonical ERD reference.

## Required Env Vars

Loaded via `@nestjs/config` (global in `app.module.ts:14`):

```
DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
JWT_SECRET, JWT_EXPIRES_IN
PORT                       # default 3000
```

DB/Redis expected to run via `p07-infra/docker-compose.yml` on localhost.

## Entry Point (`main.ts`)

`enableCors()` (all origins), 전역 `ValidationPipe({ whitelist: true, transform: true })`, `PORT` env 구독. Swagger 와 글로벌 exception filter 는 아직.

## Auth Pattern (reference)

`auth.module.ts:19-22` registers `JwtModule.registerAsync` with `ConfigService`. Protect endpoints with `@UseGuards(JwtAuthGuard)` (see `auth.controller.ts:25-49`). Other modules import `AuthModule` to reuse the guard.

## Conventions

- **Response envelope**: 컨트롤러 메서드 리턴에서 수동 wrapping — `{ success: true, data, error: null }` (예: `auth.controller.ts`, `docs.controller.ts`). 글로벌 response interceptor 도입은 TODO.
- **Error envelope**: Nest 기본 HttpException 포맷이 나와서 스펙과 불일치. 글로벌 exception filter 로 `{ success: false, data: null, error: { code, message } }` 로 리매핑하는 작업은 TODO.
- **FTS 는 infra 책임**. `doc_chunks.fts_vector` 는 `p07-infra/init.sql` 의 DB 트리거 `doc_chunks_fts_update` (config `public.korean`, mecab-ko) 가 자동 채움. 앱 코드에서 `fts_vector` 쓰지 말 것. `onModuleInit` 에서 FTS DDL 실행 **절대 금지** (이전 PR에서 infra 트리거와 충돌한 전례 있음).
- **색인은 동기** 로 동작. 업로드 → 파싱 → 청킹 → INSERT → 트리거 자동 실행이 한 트랜잭션 안에서. 큐 기반 비동기 색인은 TODO.

## What's Not Yet Wired

- No migration tooling (currently relying on `synchronize: true` + init.sql as truth)
- No Swagger/OpenAPI
- No LLM SDK / Redis usage in services (stubs only)
- Global response interceptor / exception filter (see Conventions)
- `POST /docs` URL ingest (현재 501 NotImplemented — SSRF 허용 도메인 정책 필요)
- `PUT /docs/:docId`, `DELETE /docs/:docId`, `POST /docs/:docId/reindex` (별도 티켓, Story 5)
- 비동기 색인 큐
