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

    local templates_dir="$SCRIPT_DIR/templates"

    if [ ! -d "$templates_dir" ]; then
        log_error "Templates directory not found: $templates_dir"
        exit 1
    fi

    # PascalCase: "task" -> "Task", "user_task" -> "UserTask"
    local pascal_name
    pascal_name="$(echo "${feature_name}" | awk -F'_' '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1' OFS='')"
    # Plural: "task" -> "tasks", "category" -> "categories"
    local plural_name="${feature_name}s"
    local snake_name="$feature_name"

    log_info "Creating feature: $feature_name ($pascal_name)"

    # Create directories
    mkdir -p "$PROJECT_ROOT/client/src/containers/$plural_name"
    mkdir -p "$PROJECT_ROOT/client/src/components/$plural_name"
    mkdir -p "$PROJECT_ROOT/client/src/services"
    mkdir -p "$PROJECT_ROOT/client/src/types"
    mkdir -p "$PROJECT_ROOT/client/src/app/$plural_name"
    mkdir -p "$PROJECT_ROOT/tests/unit/containers/$plural_name"
    mkdir -p "$PROJECT_ROOT/tests/e2e"

    # sed replacement — placeholders in templates
    local expr="s/{{PASCAL}}/$pascal_name/g; s/{{SNAKE}}/$snake_name/g; s/{{PLURAL}}/$plural_name/g"

    # Copy templates, replacing placeholders
    sed "$expr" "$templates_dir/type.ts"       > "$PROJECT_ROOT/client/src/types/${snake_name}.ts"
    sed "$expr" "$templates_dir/service.ts"     > "$PROJECT_ROOT/client/src/services/${pascal_name}Service.ts"
    sed "$expr" "$templates_dir/container.tsx"  > "$PROJECT_ROOT/client/src/containers/${plural_name}/${pascal_name}Container.tsx"
    sed "$expr" "$templates_dir/view.tsx"       > "$PROJECT_ROOT/client/src/components/${plural_name}/${pascal_name}View.tsx"
    sed "$expr" "$templates_dir/page.tsx"       > "$PROJECT_ROOT/client/src/app/${plural_name}/page.tsx"

    local migration_ts
    migration_ts="$(date -u +%Y%m%d%H%M%S)"
    sed "$expr" "$templates_dir/migration.sql"  > "$PROJECT_ROOT/supabase/migrations/${migration_ts}_add_${plural_name}.sql"

    log_success "Feature scaffolded: $feature_name"
    echo ""
    log_info "Generated files:"
    echo "  client/src/types/${snake_name}.ts"
    echo "  client/src/services/${pascal_name}Service.ts"
    echo "  client/src/containers/${plural_name}/${pascal_name}Container.tsx"
    echo "  client/src/components/${plural_name}/${pascal_name}View.tsx"
    echo "  client/src/app/${plural_name}/page.tsx"
    echo "  supabase/migrations/${migration_ts}_add_${plural_name}.sql"
    echo ""
    log_warning "Remaining manual steps:"
    echo "  1. Add RPC entries to client/src/types/rpc.ts"
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