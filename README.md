# SupaNext Starter Template

A production-ready NextJS + Supabase starter template with function-first database architecture, comprehensive authentication, and modern UI components.

## Quick Start

### Automated Setup (Recommended)

```bash
# Clone the template
git clone <your-repo-url> supanext
cd supanext

# Run automated setup
./scripts/setup.sh setup

# Start development
./scripts/setup.sh dev
```

### Manual Setup

```bash
# Install dependencies
pnpm install

# Setup Supabase
cd supabase && supabase start && supabase db reset

# Generate database types
supabase gen types typescript > ../client/src/types/database.ts

# Start development
cd ../client && pnpm run dev
```

## Architecture

This template implements a sophisticated **function-first database architecture** where:

- **NextJS Static Export** - Client-side only, no server components
- **Function-First Database** - All operations through PostgreSQL functions
- **Layered Frontend** - Pages -> Containers -> Services -> Repository -> Database
- **User-Centric Auth** - User-owned resources with system admin role
- **Modern UI** - shadcn/ui + TailwindCSS components

### Tech Stack

- **Frontend**: NextJS, React, TypeScript, shadcn/ui, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Package Manager**: pnpm
- **Deployment**: Static export (Vercel, Netlify, etc.)

## Project Structure

```
/project-root/
├── docs/              # Documentation
├── client/            # NextJS frontend application
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   │   ├── auth/          # Authentication pages
│   │   │   ├── dashboard/     # Dashboard page
│   │   │   ├── profile/       # Profile page
│   │   │   ├── admin/         # System admin pages
│   │   │   ├── layout.tsx     # Root layout
│   │   │   ├── page.tsx       # Home page
│   │   │   └── globals.css    # Global styles
│   │   ├── components/        # UI components (stateless)
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   └── <feature>/     # Feature components
│   │   ├── containers/        # State management + service calls
│   │   │   └── <feature>/     # Feature containers
│   │   ├── services/          # Business logic wrappers
│   │   ├── repositories/      # Data access layer
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities and configurations
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utility functions
│   ├── tests/                 # Test files
│   ├── public/                # Static assets
│   └── ...config files
├── backend/           # Edge function business logic (scaffold)
├── supabase/          # Database and edge functions
│   ├── migrations/        # SQL schema migrations
│   ├── tests/             # pgTAP database tests
│   └── README.md          # Database architecture guide
├── scripts/           # Development and setup scripts
├── CLAUDE.md          # Claude Code development guide
└── README.md          # Project documentation
```

## Key Features

### Database Architecture
- **Function-First Access**: All database operations through secure functions
- **Restrictive RLS**: "Deny all" default policies with selective access
- **Business Logic Encapsulation**: Rules live in PostgreSQL, not application code
- **Comprehensive Audit**: All important actions tracked automatically

### Authentication & Authorization
- **User Management**: Registration, login, password reset
- **System Admin**: Platform-wide admin role for user/plan management
- **User Subscriptions**: Per-user subscription plans with feature gating
- **Centralized Auth**: Auth provider with automatic permission handling

### Frontend Architecture
- **Container Pattern**: State management isolated from UI components
- **Service Layer**: Clean separation between UI and business logic
- **Repository Pattern**: Consistent data access patterns
- **Stateless Components**: Reusable UI components that receive data via props

## Core Concepts

### Function-First Database Philosophy

Instead of traditional API development, we use PostgreSQL functions:

```sql
-- ❌ Traditional approach: Direct table access
SELECT * FROM user_campaigns WHERE user_id = 'xyz';

-- ✅ Our approach: Secure function calls
SELECT * FROM list_my_campaigns(p_limit => 20);
```

**Benefits:**
- **Less Effort**: No HTTP layer, serialization, middleware
- **Better Security**: Database-level enforcement
- **Higher Performance**: Direct data access, optimized queries
- **Single Source of Truth**: Business rules in one place

### Container Pattern

Containers manage state and call services, components are stateless:

```typescript
// ❌ Component with API calls (DON'T DO THIS)
export function CampaignList() {
  const [campaigns, setCampaigns] = useState(null);
  useEffect(() => {
    fetch('/api/campaigns').then(setCampaigns); // Bad!
  }, []);
  return <div>{campaigns?.map(...)}</div>;
}

// ✅ Container + Component pattern (DO THIS)
// CampaignListContainer.tsx
export function CampaignListContainer() {
  const { data: campaigns, loading, error } = campaignService.listCampaigns();
  return <CampaignList campaigns={campaigns} loading={loading} error={error} />;
}

// CampaignList.tsx (stateless component)
export function CampaignList({ campaigns, loading, error }) {
  if (loading) return <Skeleton />;
  if (error) return <Error message={error} />;
  return <div>{campaigns?.map(c => <CampaignCard key={c.id} campaign={c} />)}</div>;
}
```

## Development

### Frontend Development

```bash
cd client
pnpm install        # Install dependencies
pnpm run dev        # Start development server
pnpm run build      # Build for production
pnpm run lint       # Run ESLint
pnpm run test:unit  # Run unit tests
pnpm run test:e2e   # Run E2E tests
```

### Database Development

```bash
cd supabase
supabase start                    # Start local development
supabase migration new name       # Create migration
supabase db reset                 # Apply migrations
supabase gen types typescript     # Generate types
```

### Testing

```bash
# Unit tests (Vitest)
pnpm run test:unit
pnpm run test:unit -- --watch

# E2E tests (Playwright)
pnpm run test:e2e
pnpm run test:e2e -- --ui
```

## Usage Examples

### Creating a Campaign

```typescript
// In container component
const { data, error } = await campaignService.createCampaign({
  name: 'My Campaign',
  description: 'A new campaign',
  goalMinor: 5000, // $50.00 in cents
  currency: 'USD',
});
```

### Managing User Subscriptions

```typescript
// System admin assigns subscription
await adminService.assignSubscription(userId, {
  planId: 'pro-plan',
  billingPeriod: 'monthly',
});

// User checks their subscription
const { subscription, hasFeature } = useSubscription();
if (hasFeature('advanced_analytics')) {
  // Show premium feature
}
```

## Security Features

- **Function-Level Authorization**: Each function implements permission checks
- **Restrictive RLS**: "Deny all" policies with function-based access
- **Audit Logging**: All important actions tracked with IP addresses
- **Input Validation**: Database-level validation in functions

## Deployment

### Frontend (Static Export)

```bash
# Build static site
pnpm run build

# Deploy to Vercel
vercel deploy

# Or deploy to Netlify
netlify deploy --prod
```

### Backend (Supabase)

```bash
# Push migrations to production
supabase db push

# Deploy edge functions
supabase functions deploy
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive development guide for Claude Code
- **[supabase/README.md](./supabase/README.md)** - Database architecture documentation
- **[docs/](./docs/)** - Additional project documentation

## Contributing

When contributing to this project:

1. **Database First**: Create database functions before application code
2. **Follow Patterns**: Use existing container/service/repository patterns
3. **Test Everything**: Write unit tests for services, E2E tests for features
4. **Security First**: Always use database functions, never direct queries
5. **Document Changes**: Update relevant documentation

## License

This template is provided as-is for educational and commercial use.
