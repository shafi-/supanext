#!/bin/bash

# ====================================================================
# SupaNext Development Setup Script
# ====================================================================
# This script helps set up and manage the SupaNext development environment
# Usage: ./scripts/setup.sh [command]
# ====================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."

    local missing_deps=()

    if ! command_exists pnpm; then
        missing_deps+=("pnpm")
    fi

    if ! command_exists node; then
        missing_deps+=("node")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        echo "Please install missing dependencies:"
        echo "  pnpm: npm install -g pnpm"
        echo "  node: https://nodejs.org/"
        exit 1
    fi

    log_success "All dependencies found"
}

# Install dependencies
install_deps() {
    log_info "Installing dependencies..."
    cd "$PROJECT_ROOT/client"
    pnpm install
    log_success "Dependencies installed"
}

# Setup Supabase
setup_supabase() {
    log_info "Setting up Supabase..."

    cd "$PROJECT_ROOT/supabase"

    if ! command_exists supabase; then
        log_warning "Supabase CLI not found. Installing..."
        npm install -g supabase
    fi

    # Generate the active config.toml (CLI reads only that filename).
    # Preference: your config.local.toml > committed sample.
    if [ ! -f config.toml ]; then
        if [ -f config.local.toml ]; then
            cp config.local.toml config.toml
            log_info "Created config.toml from config.local.toml"
        else
            cp config.sample.toml config.toml
            log_info "Created config.toml from config.sample.toml"
        fi
    fi

    # Start Supabase
    log_info "Starting Supabase local environment..."
    supabase start

    # Apply migrations
    log_info "Applying database migrations..."
    supabase db reset

    # Generate types
    log_info "Generating TypeScript types..."
    supabase gen types typescript > "$PROJECT_ROOT/client/src/types/database.ts"

    log_success "Supabase setup complete"
    echo ""
    log_info "Supabase local URLs:"
    echo "  Database: postgresql://postgres:postgres@localhost:54322/postgres"
    echo "  API: http://localhost:54321"
    echo "  Inbucket (emails): http://localhost:54324"
}

# Generate database types
generate_types() {
    log_info "Generating database types..."

    cd "$PROJECT_ROOT/supabase"
    supabase gen types typescript > "$PROJECT_ROOT/client/src/types/database.ts"

    log_success "Database types generated"
}

# Create new migration
create_migration() {
    local migration_name="$1"

    if [ -z "$migration_name" ]; then
        log_error "Please provide a migration name"
        echo "Usage: ./scripts/setup.sh migration <name>"
        exit 1
    fi

    log_info "Creating migration: $migration_name"

    cd "$PROJECT_ROOT/supabase"
    supabase migration new "$migration_name"

    log_success "Migration created: supabase/migrations/$(ls -t supabase/migrations/ | head -1)"
    echo ""
    log_info "Edit the migration file, then run:"
    echo "  ./scripts/setup.sh migrate"
}

# Apply migrations
apply_migrations() {
    log_info "Applying database migrations..."

    cd "$PROJECT_ROOT/supabase"
    supabase db reset

    log_success "Migrations applied"
    generate_types
}

# Reset database
reset_database() {
    log_warning "This will reset the entire database. Continue? (y/n)"
    read -r response

    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_info "Resetting database..."
        cd "$PROJECT_ROOT/supabase"
        supabase db reset
        log_success "Database reset complete"
        generate_types
    else
        log_info "Database reset cancelled"
    fi
}

# Start development environment
start_dev() {
    log_info "Starting development environment..."

    # Check if Supabase is running
    if ! curl -s http://localhost:54321/health > /dev/null 2>&1; then
        log_info "Starting Supabase..."
        cd "$PROJECT_ROOT/supabase"
        supabase start
    fi

    # Start NextJS dev server
    log_info "Starting NextJS development server..."
    cd "$PROJECT_ROOT/client"
    pnpm run dev
}

# Run tests
run_tests() {
    local test_type="$1"

    case "$test_type" in
        unit)
            log_info "Running unit tests..."
            cd "$PROJECT_ROOT/client"
            pnpm run test:unit
            ;;
        e2e)
            log_info "Running E2E tests..."
            cd "$PROJECT_ROOT/client"
            pnpm run test:e2e
            ;;
        all|"")
            log_info "Running all tests..."
            cd "$PROJECT_ROOT/client"
            pnpm run test:unit
            pnpm run test:e2e
            ;;
        *)
            log_error "Unknown test type: $test_type"
            echo "Available: unit, e2e, all"
            exit 1
            ;;
    esac
}

# Build project
build_project() {
    log_info "Building project..."

    cd "$PROJECT_ROOT/client"
    pnpm run build

    log_success "Build complete"
    echo ""
    log_info "Output directory: client/out/"
}

# Lint code
lint_code() {
    log_info "Running linter..."

    cd "$PROJECT_ROOT/client"
    pnpm run lint

    log_success "Linting complete"
}

# Create new feature with CRUD scaffolding
create_feature() {
    local feature_name="$1"

    if [ -z "$feature_name" ]; then
        log_error "Please provide a feature name"
        echo "Usage: ./scripts/setup.sh feature <name>"
        echo "  e.g. ./scripts/setup.sh feature task"
        exit 1
    fi

    # PascalCase for types/classes (e.g. "task" -> "Task", "user_task" -> "UserTask")
    local pascal_name
    pascal_name="$(echo "${feature_name}" | sed -r 's/(^|_)([a-z])/\U\2/g')"
    # Plural list name (e.g. "task" -> "tasks", "category" -> "categories")
    local plural_name="${feature_name}s"
    local snake_name="$feature_name"

    log_info "Creating feature: $feature_name ($pascal_name)"

    # ── directories ──────────────────────────────────────────────
    mkdir -p "$PROJECT_ROOT/client/src/containers/$plural_name"
    mkdir -p "$PROJECT_ROOT/client/src/components/$plural_name"
    mkdir -p "$PROJECT_ROOT/client/src/services"
    mkdir -p "$PROJECT_ROOT/client/src/types"
    mkdir -p "$PROJECT_ROOT/tests/unit/containers/$plural_name"
    mkdir -p "$PROJECT_ROOT/tests/e2e"

    # ── type ─────────────────────────────────────────────────────
    cat > "$PROJECT_ROOT/client/src/types/${snake_name}.ts" <<TYPE_EOF
/**
 * ${pascal_name}-related type definitions.
 * Single source of truth — service files re-export from here.
 */
export interface ${pascal_name} {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}
TYPE_EOF

    # ── service ──────────────────────────────────────────────────
    cat > "$PROJECT_ROOT/client/src/services/${pascal_name}Service.ts" <<SVC_EOF
import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import type { PaginatedResponse, PaginationParams } from '@/types/pagination'
import { Rpc } from '@/types/rpc'
import type { ${pascal_name} } from '@/types/${snake_name}'

export class ${pascal_name}Service extends BaseRepository {
  async list(params?: PaginationParams): ServiceData<PaginatedResponse<${pascal_name}>> {
    return this.callRpc<PaginatedResponse<${pascal_name}>>(Rpc.${pascal_name}.List, {
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    })
  }

  async create(input: { name: string; description?: string }): ServiceData<string> {
    return this.callRpc<string>(Rpc.${pascal_name}.Create, {
      p_name: input.name,
      p_description: input.description,
    })
  }

  async update(
    id: string,
    patch: { name?: string; description?: string }
  ): ServiceData<void> {
    return this.callRpc<void>(Rpc.${pascal_name}.Update, {
      p_${snake_name}_id: id,
      p_name: patch.name,
      p_description: patch.description,
    })
  }

  async delete(id: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.${pascal_name}.Delete, { p_${snake_name}_id: id })
  }
}

export const ${snake_name}Service = new ${pascal_name}Service()
SVC_EOF

    # ── container ────────────────────────────────────────────────
    cat > "$PROJECT_ROOT/client/src/containers/$plural_name/${pascal_name}Container.tsx" <<CTR_EOF
'use client'

import { useState, useCallback } from 'react'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { ${snake_name}Service } from '@/services/${pascal_name}Service'
import { ${pascal_name}View } from '@/components/$plural_name/${pascal_name}View'
import type { ${pascal_name} } from '@/types/${snake_name}'

export function ${pascal_name}Container() {
  const {
    items,
    loading,
    error,
    loadMore,
    hasMore,
  } = usePaginatedList((params) => ${snake_name}Service.list(params))

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<${pascal_name} | null>(null)

  const handleCreate = useCallback(async (data: { name: string; description?: string }) => {
    const { error } = await ${snake_name}Service.create(data)
    if (!error) setShowCreate(false)
  }, [])

  const handleUpdate = useCallback(async (id: string, data: Partial<${pascal_name}>) => {
    const { error } = await ${snake_name}Service.update(id, data)
    if (!error) setEditing(null)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await ${snake_name}Service.delete(id)
  }, [])

  return (
    <${pascal_name}View
      items={items}
      loading={loading}
      error={error}
      hasMore={hasMore}
      onLoadMore={loadMore}
      showCreate={showCreate}
      onToggleCreate={() => setShowCreate(!showCreate)}
      onCreate={handleCreate}
      editing={editing}
      onEdit={setEditing}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  )
}
CTR_EOF

    # ── view component ───────────────────────────────────────────
    cat > "$PROJECT_ROOT/client/src/components/$plural_name/${pascal_name}View.tsx" <<VIEW_EOF
'use client'

import { Button } from '@/components/ui/button'
import type { ${pascal_name} } from '@/types/${snake_name}'

interface ${pascal_name}ViewProps {
  items: ${pascal_name}[]
  loading: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  showCreate: boolean
  onToggleCreate: () => void
  onCreate: (data: { name: string; description?: string }) => Promise<void>
  editing: ${pascal_name} | null
  onEdit: (item: ${pascal_name} | null) => void
  onUpdate: (id: string, data: Partial<${pascal_name}>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function ${pascal_name}View({
  items,
  loading,
  error,
  hasMore,
  onLoadMore,
  showCreate,
  onToggleCreate,
  editing,
  onDelete,
}: ${pascal_name}ViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">${pascal_name}s</h1>
        <Button onClick={onToggleCreate}>
          {showCreate ? 'Cancel' : 'New ${pascal_name}'}
        </Button>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <div className="grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {/* onEdit */}}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}

      {!loading && hasMore && (
        <Button variant="outline" onClick={onLoadMore} className="w-full">
          Load more
        </Button>
      )}
    </div>
  )
}
VIEW_EOF

    # ── page ─────────────────────────────────────────────────────
    mkdir -p "$PROJECT_ROOT/client/src/app/$plural_name"
    cat > "$PROJECT_ROOT/client/src/app/$plural_name/page.tsx" <<PAGE_EOF
import { ${pascal_name}Container } from '@/containers/$plural_name/${pascal_name}Container'

export default function ${pascal_name}sPage() {
  return <${pascal_name}Container />
}
PAGE_EOF

    # ── migration stub ───────────────────────────────────────────
    local migration_ts
    migration_ts="$(date -u +%Y%m%d%H%M%S)"
    mkdir -p "$PROJECT_ROOT/supabase/migrations"
    cat > "$PROJECT_ROOT/supabase/migrations/${migration_ts}_add_${plural_name}.sql" <<SQL_EOF
-- ============================================================
-- ${pascal_name} feature
-- ============================================================

-- Table
CREATE TABLE user_${plural_name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_${plural_name} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all" ON user_${plural_name} FOR ALL USING (false);
CREATE POLICY "own_select" ON user_${plural_name} FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON user_${plural_name} FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON user_${plural_name} FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "own_delete" ON user_${plural_name} FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "admin_all" ON user_${plural_name} FOR ALL USING (is_system_admin(auth.uid()));

-- Functions
CREATE OR REPLACE FUNCTION list_my_${plural_name}(
  p_limit INTEGER DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS \$\$
  DECLARE
    result JSONB;
  BEGIN
    SELECT jsonb_build_object(
      'items', COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb),
      'next_cursor', (
        SELECT MIN(created_at) FROM user_${plural_name}
        WHERE user_id = auth.uid()
        AND created_at < COALESCE(p_cursor, NOW())
      )
    )
    INTO result
    FROM (
      SELECT * FROM user_${plural_name}
      WHERE user_id = auth.uid()
      AND (p_cursor IS NULL OR created_at < p_cursor)
      ORDER BY created_at DESC
      LIMIT p_limit + 1
    ) t;

    IF jsonb_array_length(result->'items') > p_limit THEN
      result := jsonb_set(result, '{items}',
        result->'items' - jsonb_array_length(result->'items') - 1
      );
    END IF;

    RETURN result;
  END;
\$\$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION create_${snake_name}(
  p_name TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS \$\$
  DECLARE
    v_id UUID;
  BEGIN
    INSERT INTO user_${plural_name} (user_id, name, description)
    VALUES (auth.uid(), p_name, p_description)
    RETURNING id INTO v_id;
    RETURN v_id;
  END;
\$\$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION update_${snake_name}(
  p_${snake_name}_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS VOID AS \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_${plural_name} WHERE id = p_${snake_name}_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION '${pascal_name} not found or access denied';
  END IF;

  UPDATE user_${plural_name} SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    updated_at = NOW()
  WHERE id = p_${snake_name}_id;
END;
\$\$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION delete_${snake_name}(p_${snake_name}_id UUID) RETURNS VOID AS \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_${plural_name} WHERE id = p_${snake_name}_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION '${pascal_name} not found or access denied';
  END IF;

  DELETE FROM user_${plural_name} WHERE id = p_${snake_name}_id;
END;
\$\$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grants
GRANT EXECUTE ON FUNCTION list_my_${plural_name}(INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION create_${snake_name}(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_${snake_name}(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_${snake_name}(UUID) TO authenticated;
SQL_EOF

    log_success "Feature scaffolded: $feature_name"
    echo ""
    log_info "Generated files:"
    echo "  client/src/types/${snake_name}.ts"
    echo "  client/src/services/${pascal_name}Service.ts"
    echo "  client/src/containers/$plural_name/${pascal_name}Container.tsx"
    echo "  client/src/components/$plural_name/${pascal_name}View.tsx"
    echo "  client/src/app/$plural_name/page.tsx"
    echo "  supabase/migrations/${migration_ts}_add_${plural_name}.sql"
    echo ""
    log_warning "Remaining manual steps:"
    echo "  1. Add RPC entries to client/src/types/rpc.ts:"
    echo "       ${pascal_name}: {"
    echo "         List: 'list_my_${plural_name}' satisfies DbFunction,"
    echo "         Create: 'create_${snake_name}' satisfies DbFunction,"
    echo "         Update: 'update_${snake_name}' satisfies DbFunction,"
    echo "         Delete: 'delete_${snake_name}' satisfies DbFunction,"
    echo "       },"
    echo "  2. Add re-export to client/src/types/index.ts"
    echo "  3. Run: cd supabase && supabase db reset"
    echo "  4. Run: supabase gen types typescript > ../client/src/types/database.ts"
    echo "  5. Wire into AppLayout nav if needed"
}

# Show help
show_help() {
    echo "SupaNext Development Setup Script"
    echo ""
    echo "Usage: ./scripts/setup.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  setup              - Complete setup (install deps, setup Supabase)"
    echo "  install           - Install dependencies only"
    echo "  supabase          - Setup Supabase only"
    echo "  types             - Generate database types"
    echo "  migration <name>  - Create new migration"
    echo "  migrate           - Apply migrations"
    echo "  reset-db          - Reset database (CAUTION: deletes all data)"
    echo "  dev               - Start development environment"
    echo "  test [type]       - Run tests (unit, e2e, or all)"
    echo "  build             - Build project for production"
    echo "  lint              - Run linter"
    echo "  feature <name>    - Create new CRUD feature (types, service, container, component, page, migration)"
    echo "  help              - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/setup.sh setup"
    echo "  ./scripts/setup.sh migration add_user_preferences"
    echo "  ./scripts/setup.sh dev"
    echo "  ./scripts/setup.sh test e2e"
}

# Main script logic
main() {
    local command="$1"
    shift || true

    case "$command" in
        setup)
            check_dependencies
            install_deps
            setup_supabase
            log_success "Setup complete! Run './scripts/setup.sh dev' to start development"
            ;;
        install)
            check_dependencies
            install_deps
            ;;
        supabase)
            setup_supabase
            ;;
        types)
            generate_types
            ;;
        migration)
            create_migration "$@"
            ;;
        migrate)
            apply_migrations
            ;;
        reset-db)
            reset_database
            ;;
        dev)
            start_dev
            ;;
        test)
            run_tests "$@"
            ;;
        build)
            build_project
            ;;
        lint)
            lint_code
            ;;
        feature)
            create_feature "$@"
            ;;
        help|"")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"