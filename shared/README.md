# Shared package

Cross-cutting **TypeScript types** and **JSON event schemas** used by backend, frontend, Lambdas, and agents.

## Usage

- Import types from `@airline-ops/shared` (configure path alias in backend/frontend tsconfig)
- Validate inbound events in Lambdas against `schemas/events/*.schema.json`

## Adding a new event

1. Add schema under `schemas/events/`
2. Document in `docs/EVENT_CATALOG.md`
3. Add TypeScript interface if needed in `types/index.ts`
