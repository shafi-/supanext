# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NextJS + Supabase project starter template with pre-built common components. The frontend exports to static deployment (no server components allowed) with a layered architecture including service and repository layers, containers, and components.

## Architecture

### Frontend Architecture
- **Static Export**: Frontend uses `output: 'export'` - no server components, everything must be client-side
- **No Dynamic Routes**: Static export cannot use `[param]` path segments. Use query params instead: `/orgs?id=xxx` not `/orgs/xxx`
- **Query Param Validation**: Use `useRequiredParam(key)` hook + `isUuid()` / `isInviteToken()` validators for safe param extraction
- **Layered Structure**: Pages → Services → Repositories → Supabase Client Manager
- **Container Pattern**: Containers manage state, communicate with services, and compose UI from components
- **Component Contract**: Components are stateless and never make API calls directly

### Backend Architecture
- **Supabase**: Database and authentication backend
- **Function-First Database**: All operations through PostgreSQL functions, no direct table access
- **Restrictive RLS**: "Deny all" default policies with selective access for complex filtering
- **Client-Side Auth**: Auth via supabase-js directly (sign-in/sign-up/reset in `useAuth` provider). Edge functions scaffolded in `supabase/functions/` — add only when server-side secrets are needed
- **Shared Logic**: `/backend` holds business logic shared across edge functions (scaffold, currently empty)
- **Repository Pattern**: BaseRepository wraps RPC calls, extended by feature-specific repositories
- **RPC Type Safety**: `Rpc` const in `types/rpc.ts` uses `satisfies DbFunction` to validate function names against `database.ts` at compile time. Services use nested `Rpc.Group.Action` pattern (e.g., `Rpc.Todo.Create`).
- **Explicit Grant Surface**: `REVOKE ... FROM PUBLIC` + explicit GRANTs at the end of the security hardening migration declare the full callable API. New RPCs must be added there.

### Database Architecture Philosophy
The project treats PostgreSQL as an application backend, not just data storage:
- **API-like Functions**: Each function acts like a well-defined API endpoint
- **Business Logic Encapsulation**: Complex rules live in database functions
- **Security by Default**: RLS + SECURITY DEFINER ensures proper authorization
- **Single Source of Truth**: Business rules defined once in the database
- **Less Effort Than Traditional APIs**: No HTTP layer, serialization, middleware overhead

See `/supabase/README.md` for detailed database architecture documentation.

### Authentication & Authorization
- **Centralized**: All auth and permission handling in auth provider
- **Page-level Declaration**: Each page declares who can access it
- **Hook System**: Custom hooks for auth checks and role verification
- **Unauthorized Access**: Proper redirection to login/error pages

## Directory Structure

```
/project-root/
├── docs/              # Documentation
├── client/            # NextJS frontend application
├── backend/           # Shared edge-function business logic (scaffold, currently empty)
├── supabase/          # Database migrations, tests, and edge functions
│   ├── migrations/    # SQL schema migrations
│   ├── tests/         # pgTAP database tests (psql)
│   └── functions/     # Edge functions (scaffold — add when server-side secrets needed)
└── scripts/           # setup.sh, bootstrap-admin.sh
```

## Key Architectural Patterns

### Repository Pattern
- `BaseRepository`: Abstract base class with standard CRUD operations
- Feature repositories extend `BaseRepository` for specific queries
- All database access goes through repositories, never from containers/components

### Container Pattern
- Containers are the only layer that communicates with services
- Containers manage all state (loading, error, data)
- Components receive data as props and emit events via callbacks
- No API calls or service layer access from components

### Service Layer
- Services use repositories for data access
- Business logic validation and transformation happens here
- Services are pure functions or classes with methods (no state)

### Auth Flow
- Client-side supabase-js handles: sign-up, sign-in, password reset (via `useAuth` provider)
- Frontend uses custom hooks: `useAuth()`, `useRequireAuth()`, `useHasRole()`
- Auth provider wraps application, manages auth state
- Unauthorized access redirects to login or shows access denied

## Development Commands

### Frontend Development
```bash
# Install dependencies
cd client && pnpm install

# Run development server
pnpm run dev

# Build for static export
pnpm run build

# Run linting
pnpm run lint

# Run unit tests
pnpm run test:unit

# Run E2E tests
pnpm run test:e2e
```

### UI Component Development
```bash
# Add shadcn/ui component
pnpm dlx shadcn-ui@latest add [component-name]

# Update shadcn/ui components
pnpm dlx shadcn-ui@latest add [component-name] --overwrite

# List available shadcn/ui components
pnpm dlx shadcn-ui@latest add --help

# TailwindCSS utilities are available globally
# No additional setup needed for styling
```

### Testing
```bash
# Unit tests (Vitest)
pnpm run test:unit

# Single test file
pnpm run test:unit -- path/to/test.spec.ts

# Watch mode
pnpm run test:unit -- --watch

# E2E tests (Playwright)
pnpm run test:e2e

# E2E with UI
pnpm run test:e2e -- --ui

# Single E2E test
pnpm run test:e2e -- path/to/spec.ts
```

### Supabase Development
```bash
# Start local development environment
cd supabase && supabase start

# Generate migration
supabase migration new migration_name

# Apply migrations locally
supabase db reset

# Push to remote
supabase db push

# Generate types from database
supabase gen types typescript > client/src/types/database.ts

# Access database directly
psql 'postgresql://postgres:postgres@localhost:54322/postgres'

# Check migration status
supabase migration list
```

### Database Function Development
```bash
# Create new function migration
supabase migration new add_entity_functions

# Test functions locally
psql 'postgresql://postgres:postgres@localhost:54322/postgres'
# Then: SELECT * from test_function();

# Reset database after changes
supabase db reset
```

### Edge Functions
```bash
# Serve edge functions locally
cd supabase && supabase functions serve

# Deploy specific function
supabase functions deploy function_name

# Deploy all
supabase functions deploy
```

## Common Patterns

### Creating a New Feature Page
1. Create page component with auth/role declarations
2. Create container to handle service calls and state
3. Create service (if new business logic needed)
4. Create/extend repository (if new data access needed)
5. Create components for UI composition
6. Write unit tests for service/repository
7. Write E2E tests for user flows

### Adding Database Operations
1. **Create database function** (in new migration):
   ```sql
   CREATE OR REPLACE FUNCTION create_entity(entity_data JSONB)
   RETURNS entity_view AS $$
     -- Business logic and validation
     -- Return structured data
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```
2. **Add service wrapper**:
   ```typescript
   async createEntity(data: CreateEntityDto) {
     return this.supabase.rpc('create_entity', { entity_data: data });
   }
   ```
3. **Call service from container** and handle states
4. **Update UI components** to display results

### Database Development Workflow
1. Create migration: `supabase migration new feature_name`
2. Write function with proper authorization checks
3. Test locally: `psql` + `supabase db reset`
4. Generate types: `supabase gen types typescript`
5. Update service layer to use new function
6. Test from application code

### Adding API Operations (Non-Database)
1. Add repository method extending BaseRepository
2. Add service method that uses repository
3. Call service from container
4. Handle loading/error/success states in container
5. Update UI components to display results

### Auth Implementation
- Use `useRequireAuth()` in containers for protected pages
- Use `useHasRole('role_name')` for role-based access
- Declare page access at top of page component
- Auth provider handles redirects automatically

## Technology Stack

- **Frontend**: NextJS (static export), React, TypeScript
- **UI Components**: shadcn/ui + TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Edge Runtime**: Cloudflare Workers/Supabase Edge Functions
- **State Management**: React hooks + Context API (Auth Provider)

### UI Development Guidelines

**shadcn/ui Components**:
- Use pre-built shadcn/ui components as the foundation
- Components are installed into the project (not npm dependencies)
- Extend shadcn/ui components for project-specific needs
- Follow shadcn/ui patterns for consistency

**TailwindCSS Styling**:
- Use utility classes for styling
- Follow TailwindCSS best practices and design tokens
- Maintain consistent spacing, colors, and typography
- Extend Tailwind config for project-specific design tokens

**Component Integration**:
- shadcn/ui components integrate seamlessly with the container pattern
- Components remain stateless (receive data via props, emit via callbacks)
- Use shadcn/ui form components for data collection
- Leverage shadcn/ui hooks (useToast, useDialog, etc.) for interactions

## Important Constraints

- No server components - all client-side only
- Components cannot make API calls or access services
- All database access must go through PostgreSQL functions (never direct table queries)
- All data access must go through repository layer (for non-DB operations)
- Edge functions import business logic from `/backend` directory
- Static export means no API routes in NextJS
- Auth is edge-function-based, not NextJS auth
- Database functions must implement proper authorization checks
- Never bypass database functions for "quick fixes"

## Error Handling

- Repository errors bubble to service layer
- Service errors transformed to user-friendly messages
- Container handles service errors for display
- Components don't handle errors, receive error state as prop
- Unauthorized access triggers redirect via auth provider

## Code Organization Principles

- **Separation of Concerns**: Each layer has distinct responsibilities
- **Single Responsibility**: Services/repositories handle one domain
- **DRY**: BaseRepository eliminates repetitive CRUD code
- **Type Safety**: Strong typing throughout, especially data models
- **Testability**: Pure functions in services, isolated repositories
- **Database-First Logic**: Business rules in PostgreSQL functions, not application code
- **Function-Only Data Access**: Never query tables directly from client code
- **Security Through Functions**: Authorization checks inside database functions
- **Consistent Interfaces**: Functions return structured data via views
