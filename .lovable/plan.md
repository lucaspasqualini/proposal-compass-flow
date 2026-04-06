

# Business Management System for Consulting Firm

## Overview
A complete proposal, project, and team management system for a small consulting firm (1-5 users), with authentication, inspired by the Meden Consultoria reference system.

## Visual Style
- Clean, professional design with a teal/dark green primary color (#0D7377) similar to the reference
- White backgrounds, subtle borders, modern card-based layouts
- Portuguese (BR) language throughout the UI
- Sidebar navigation with collapsible menu

## Architecture

**Frontend**: React + TypeScript + Tailwind + shadcn/ui (already set up)
**Backend**: Supabase (Lovable Cloud) for auth, database, and RLS

## Modules

### 1. Authentication
- Login page styled like the reference (logo, email/password, teal button)
- Email + password auth via Supabase
- User profiles table with name, role, avatar
- Protected routes — redirect to login if not authenticated

### 2. Dashboard (Home)
- Summary cards: active proposals, active projects, team utilization
- Recent activity feed
- Quick action buttons (new proposal, new project)

### 3. Proposals (Propostas)
- **List view**: table with filters (status, client, date range)
- **Statuses**: Draft, Sent, Under Review, Approved, Rejected
- **Create/Edit form**: client, title, description, scope of work, value (R$), validity date, payment terms
- **Detail view**: full proposal info with status timeline
- Convert approved proposal → project

### 4. Projects (Projetos)
- **List view**: cards or table with status filters
- **Statuses**: Planning, In Progress, On Hold, Completed, Cancelled
- **Create/Edit**: title, client, start/end dates, budget, description
- **Detail view**: overview, team members assigned, timeline/milestones
- Link back to originating proposal

### 5. Team Allocation (Alocação de Equipe)
- **Team members list**: name, role/specialty, availability status
- **Allocation view**: which members are assigned to which projects
- **Utilization overview**: simple percentage-based workload per person
- Assign/unassign members to projects with role and hours

### 6. Clients (Clientes)
- Client database: company name, CNPJ, contact person, email, phone, address
- List view with search
- Client detail page showing related proposals and projects

## Database Tables

```text
profiles         → id, user_id (FK auth.users), full_name, avatar_url
clients          → id, name, cnpj, contact_name, email, phone, address, notes
proposals        → id, client_id (FK), title, description, scope, value, 
                   status, validity_date, payment_terms, created_by, 
                   created_at, updated_at
projects         → id, proposal_id (FK nullable), client_id (FK), title, 
                   description, status, start_date, end_date, budget, 
                   created_at, updated_at
team_members     → id, user_id (FK nullable), name, role, specialty, 
                   hourly_rate, is_active
project_allocations → id, project_id (FK), team_member_id (FK), 
                      role_in_project, allocated_hours, start_date, end_date
```

RLS policies ensure all data is scoped to authenticated users.

## Navigation Structure

```text
Sidebar:
├── Dashboard
├── Propostas (Proposals)
├── Projetos (Projects)
├── Equipe (Team)
├── Clientes (Clients)
└── Configurações (Settings - profile/logout)
```

## Implementation Order
1. Set up Supabase (auth + database tables + RLS)
2. Login page + auth flow + protected layout
3. Sidebar navigation + layout shell
4. Clients module (needed by proposals/projects)
5. Proposals module (CRUD + status management)
6. Projects module (CRUD + proposal conversion)
7. Team members + allocation module
8. Dashboard with summary stats

## Key Technical Details
- All forms use react-hook-form + zod validation
- Data fetching via @tanstack/react-query + Supabase client
- Currency formatted as BRL (R$)
- Dates in DD/MM/YYYY format (Brazilian standard)
- Responsive: works on mobile (384px viewport noted) and desktop

