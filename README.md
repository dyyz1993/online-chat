# Todo Application Template

A full-stack React + Hono application template with TypeScript, demonstrating best practices for monorepo-style architecture with single-port development.

## Features

- **Frontend**: React with TypeScript, Vite
- **Backend**: Hono with TypeScript
- **Database**: SQLite with Drizzle ORM
- **State Management**: Zustand
- **Testing**: Vitest (unit + integration tests)
- **Code Quality**: ESLint, Prettier, pre-commit hooks
- **Type Safety**: End-to-end type safety with Hono RPC

## Architecture

```
src/
├── client/          # React frontend
│   ├── components/  # UI components
│   ├── stores/      # Zustand state management
│   ├── services/    # API clients
│   ├── test/        # Test setup
│   └── App.tsx
├── server/          # Hono backend
│   ├── module-todos/ # Todo module
│   │   ├── routes/
│   │   ├── services/
│   │   └── __tests__/
│   ├── shared/      # Database configuration
│   ├── integration/ # Integration tests
│   └── index.ts
└── shared/          # Shared types
    ├── types.ts
    ├── rpc-server.ts
    └── schemas.ts
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at http://localhost:3010

### Build

```bash
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm test:unit

# Run integration tests only
npm test:integration
```

## Key Concepts

### Path Aliases

- `@shared/*` → src/shared/*
- `@client/*` → src/client/*
- `@server/*` → src/server/*

### Single-Port Development

Uses `@hono/vite-dev-server` to run both frontend and backend on port 3010.

### Hono RPC

Provides type-safe API calls from frontend to backend:

```typescript
import { rpcClient } from '@shared/rpc-server';

const response = await rpcClient.api.todos.$get();
const result = await response.json();
```

### Module Structure

Backend is organized by feature modules (`module-todos/`), each containing:
- `routes/` - API endpoints
- `services/` - Business logic
- `__tests__/` - Unit tests

## Pre-commit Hooks

The project uses Husky for Git hooks:

- **lint-staged** - Format staged files
- **npm test** - Run test suite
- **validate-all** - Custom validation script

## Environment Variables

See `.env.example` for required environment variables.
