# SupaNext Starter Template

A production-ready NextJS + Supabase starter template with function-first database architecture, comprehensive authentication, and modern UI components.

## 🚀 Quick Start

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

## 🏗️ Architecture

This template implements a sophisticated **function-first database architecture** where:

- **NextJS Static Export** - Client-side only, no server components
- **Function-First Database** - All operations through PostgreSQL functions
- **Layered Frontend** - Pages → Containers → Services → Repository → Database
- **Comprehensive Auth** - Multi-tenant organizations with role-based access
- **Modern UI** - shadcn/ui + TailwindCSS components

### Tech Stack

- **Frontend**: NextJS, React, TypeScript, shadcn/ui, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Package Manager**: pnpm
- **Deployment**: Static export (Vercel, Netlify, etc.)

## 📁 Project Structure

```
/project-root/
├── docs/              # Documentation and architecture ✅
├── client/            # NextJS frontend application ✅
│   ├── src/
│   │   ├── app/               # Next.js App Router pages ✅
│   │   │   ├── auth/          # Authentication pages ✅
│   │   │   ├── dashboard/     # Dashboard page ✅
│   │   │   ├── profile/       # Profile page ✅
│   │   │   ├── layout.tsx     # Root layout ✅
│   │   │   ├── page.tsx       # Home page ✅
│   │   │   └── globals.css    # Global styles ✅
│   │   ├── components/        # UI components (stateless) ✅
│   │   │   ├── ui/            # shadcn/ui components ✅
│   │   │   └── profile/       # Feature components ✅
│   │   ├── containers/        # State management + service calls ✅
│   │   │   └── profile/       # Profile container ✅
│   │   ├── services/          # Business logic wrappers ✅
│   │   │   └── ProfileService.ts ✅
│   │   ├── repositories/      # Data access layer ✅
│   │   │   └── BaseRepository.ts ✅
│   │   ├── hooks/             # Custom React hooks ✅
│   │   │   └── useAuth.ts     # Authentication hooks ✅
│   │   ├── lib/               # Utilities and configurations ✅
│   │   │   └── supabase.ts    # Supabase client ✅
│   │   ├── types/             # TypeScript types ✅
│   │   │   ├── database.ts    # Generated DB types ✅
│   │   │   └── index.ts       # App types ✅
│   │   └── utils/             # Utility functions ✅
│   │       └── cn.ts          # Class name utility ✅
│   ├── tests/                 # Test files ✅
│   ├── public/                # Static assets
│   ├── package.json           # Dependencies ✅
│   ├── next.config.js         # NextJS config ✅
│   ├── tsconfig.json          # TypeScript config ✅
│   ├── tailwind.config.ts     # Tailwind config ✅
│   ├── vitest.config.ts       # Unit test config ✅
│   └── playwright.config.ts   # E2E test config ✅
├── backend/           # Edge function business logic (to be created)
├── supabase/          # Database and edge functions ✅
│   ├── migrations/        # SQL schema migrations ✅
│   │   ├── 20240814160000_initial_schema.sql ✅
│   │   └── 20240814160500_seed_data.sql ✅
│   ├── functions/         # Supabase edge functions (to be created)
│   └── README.md          # Database architecture guide ✅
├── scripts/           # Development and setup scripts ✅
│   └── setup.sh          # Automated setup script ✅
├── tests/             # E2E and unit tests (structure created) ✅
├── CLAUDE.md          # Claude Code development guide ✅
├── README.md          # Project documentation ✅
└── TEMPLATE_STATUS.md # Development status ✅
```

## 🔑 Key Features

### Database Architecture
- **Function-First Access**: All database operations through secure functions
- **Restrictive RLS**: "Deny all" default policies with selective access
- **Business Logic Encapsulation**: Rules live in PostgreSQL, not application code
- **Comprehensive Audit**: All important actions tracked automatically
- **Multi-Tenancy Ready**: Organization system built-in but optional

### Authentication & Authorization
- **User Management**: Registration, login, password reset
- **Multi-Tenant**: Organizations with member management
- **Role-Based Access**: Owner, Admin, Member, Viewer roles
- **Centralized Auth**: Auth provider with automatic permission handling
- **Edge Function Auth**: Secure auth operations via Supabase Edge Functions

### Frontend Architecture
- **Container Pattern**: State management isolated from UI components
- **Service Layer**: Clean separation between UI and business logic
- **Repository Pattern**: Consistent data access patterns
- **Stateless Components**: Reusable UI components that receive data via props

## 🎯 Core Concepts

### Function-First Database Philosophy

Instead of traditional API development, we use PostgreSQL functions:

```sql
-- ❌ Traditional approach: Direct table access
SELECT * FROM organizations WHERE id = 'xyz';

-- ✅ Our approach: Secure function calls
SELECT * FROM get_organization('xyz');
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
export function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch(`/api/users/${userId}`).then(setUser); // Bad!
  }, [userId]);
  return <div>{user?.name}</div>;
}

// ✅ Container + Component pattern (DO THIS)
// UserProfile.container.tsx
export function UserProfileContainer({ userId }) {
  const { data: user, loading, error } = userService.getProfile(userId);
  return <UserProfile user={user} loading={loading} error={error} />;
}

// UserProfile.tsx (stateless component)
export function UserProfile({ user, loading, error }) {
  if (loading) return <Skeleton />;
  if (error) return <Error message={error} />;
  return <div>{user?.name}</div>;
}
```

## 🛠️ Development

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

## 📚 Usage Examples

### Creating an Organization

```typescript
// In container component
const { data, error } = await organizationService.create({
  name: 'My Startup',
  slug: 'my-startup',
  description: 'A new venture'
});
```

### Managing Organization Members

```typescript
// Add member
await organizationService.addMember(orgId, 'user@example.com', 'admin');

// Get members
const { data: members } = await organizationService.getMembers(orgId);

// Update role
await organizationService.updateMemberRole(orgId, userId, 'admin');
```

### User Profile Operations

```typescript
// Get current user profile
const { data: profile } = await userService.getMyProfile();

// Update profile
await userService.updateProfile({
  full_name: 'John Doe',
  avatar_url: 'https://example.com/avatar.jpg'
});
```

## 🔐 Security Features

- **Function-Level Authorization**: Each function implements permission checks
- **Restrictive RLS**: "Deny all" policies with function-based access
- **Audit Logging**: All important actions tracked with IP addresses
- **Input Validation**: Database-level validation in functions
- **Edge Function Auth**: Secure auth operations isolated from frontend

## 🌐 Deployment

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

## 📖 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive development guide for Claude Code
- **[supabase/README.md](./supabase/README.md)** - Database architecture documentation
- **[docs/](./docs/)** - Additional project documentation

## 🤝 Contributing

When contributing to this project:

1. **Database First**: Create database functions before application code
2. **Follow Patterns**: Use existing container/service/repository patterns
3. **Test Everything**: Write unit tests for services, E2E tests for features
4. **Security First**: Always use database functions, never direct queries
5. **Document Changes**: Update relevant documentation

## 🧪 Testing Strategy

### Unit Tests (Vitest)
- Test service layer logic
- Test repository methods
- Test custom hooks
- Mock database calls

### E2E Tests (Playwright)
- Test complete user flows
- Test authentication flows
- Test authorization scenarios
- Test cross-browser compatibility

## 🎨 UI Components

Built with **shadcn/ui + TailwindCSS**:

```bash
# Add new UI component
pnpm dlx shadcn-ui@latest add [component-name]

# Available components: button, input, card, dialog, etc.
```

## 🛠️ Development Scripts

The project includes a comprehensive setup script in `scripts/setup.sh` to automate common development tasks:

```bash
# Complete setup (install deps, setup Supabase, generate types)
./scripts/setup.sh setup

# Start development environment (Supabase + NextJS)
./scripts/setup.sh dev

# Database management
./scripts/setup.sh migration <name>        # Create new migration
./scripts/setup.sh migrate                # Apply migrations
./scripts/setup.sh types                  # Generate database types
./scripts/setup.sh reset-db               # Reset database (CAUTION)

# Testing and building
./scripts/setup.sh test [unit|e2e|all]   # Run tests
./scripts/setup.sh build                  # Build for production
./scripts/setup.sh lint                   # Run linter

# Feature scaffolding
./scripts/setup.sh feature <name>         # Create new feature structure

# Show all commands
./scripts/setup.sh help
```

## 🔧 Configuration

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Application
NEXT_PUBLIC_APP_URL=your_app_url
```

### Supabase Configuration

```bash
# Link to your Supabase project
supabase link --project-ref your-project-id

# Generate types
supabase gen types typescript > client/src/types/database.ts
```

## 🚦 Getting Started Guide

### 1. Project Setup
```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 2. Database Setup
```bash
# Start Supabase locally
cd supabase && supabase start

# Apply migrations
supabase db reset

# Generate types
supabase gen types typescript > ../client/src/types/database.ts
```

### 3. Frontend Development
```bash
cd ../client
pnpm run dev
```

### 4. Start Building
- Create pages in `client/src/app/`
- Create containers in `client/src/containers/`
- Create services in `client/src/services/`
- Add database functions in `supabase/migrations/`

## 🎯 Common Tasks

### Add New Database Feature
1. Create migration: `supabase migration new feature_name`
2. Write SQL function with authorization
3. Test locally: `supabase db reset`
4. Generate types: `supabase gen types typescript`
5. Create service wrapper
6. Use in container component

### Create New Page
1. Create page component with auth declarations
2. Create container for state management
3. Create service if needed
4. Create UI components
5. Write E2E tests

### Add UI Component
```bash
pnpm dlx shadcn-ui@latest add component-name
```

## 📦 Template Features Included

- ✅ NextJS 14 with App Router
- ✅ Supabase integration
- ✅ Function-first database architecture
- ✅ Authentication system
- ✅ Organization management
- ✅ Role-based access control
- ✅ shadcn/ui components
- ✅ TailwindCSS styling
- ✅ TypeScript support
- ✅ ESLint configuration
- ✅ Vitest setup
- ✅ Playwright E2E tests
- ✅ Container pattern implementation
- ✅ Service layer architecture
- ✅ Repository pattern
- ✅ Custom hooks for auth
- ✅ Audit logging
- ✅ Static export ready

## 🤝 Support

For detailed architecture information, see:
- **[CLAUDE.md](./CLAUDE.md)** - Development guide
- **[supabase/README.md](./supabase/README.md)** - Database architecture

## 📄 License

This template is provided as-is for educational and commercial use.

---

**Built with ❤️ using function-first database architecture and modern web technologies.**