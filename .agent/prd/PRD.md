# GitShipDone — Product Requirements Document

**Version**: 1.0
**Date**: 2026-03-20
**Status**: Approved

---

## 1. App Overview & Objectives

### Vision

GitShipDone is a project tracking platform built for solo builders and indie developers who juggle multiple projects at once. It replaces the heavyweight complexity of Jira and Linear with a lightweight, journal-first experience that grows with your project — not against it.

You start with a vision. The platform helps you update it, track milestones, reflect on progress, and look back at how far you've come. Every entry, commit, milestone, and to-do compounds into a living timeline of your project's story.

### Problem Statement

Existing tools (Jira, Linear, Notion, ClickUp) are either too team-oriented, too complex, or too generic. Solo builders need:
- A fast way to capture project updates without a 12-field form
- Automatic changelogs from GitHub without manual copying
- A timeline that celebrates progress, not just surfaces open tickets
- An AI copilot that understands their project context — not generic advice

### Objectives

- TASK-OBJ-1: Provide a frictionless way to create and maintain projects with minimal overhead
- TASK-OBJ-2: Auto-generate changelogs from GitHub commit/release history
- TASK-OBJ-3: Surface AI-powered insights via a virtual PM and project manager (user-supplied API key)
- TASK-OBJ-4: Gamify progress through an auto-calculated points system
- TASK-OBJ-5: Enable project sharing via read-only public URLs
- TASK-OBJ-6: Support any project type, with specialized guidance for software projects

### Success Metrics / KPIs

- Users create at least 1 project in first session
- 60%+ of projects have at least 3 journal entries logged within 7 days of creation
- GitHub integration connected on 40%+ of software projects
- Average session length > 5 minutes (signal of meaningful engagement, not just checkin)
- 20%+ of projects shared via public URL within 30 days

---

## 2. Target Audience

**Primary**: Solo developers and indie hackers building multiple projects in parallel who want a lightweight way to track and reflect on progress.

**Secondary**: Non-technical builders (designers, makers, hobbyists) building any kind of project — a product, a treehouse, a course — who want structured tracking without enterprise overhead.

**Shared characteristics**:
- Building something on the side or full-time as a solo builder
- Motivated by progress, streaks, and public accountability
- Frustrated with Notion's lack of structure and Jira's complexity
- Likely already using GitHub for software projects

---

## 3. Competitive Landscape

### Key Competitors

| Product | Strength | Weakness |
|---|---|---|
| **Linear** | Speed, clean UI, great for dev teams | Team-first; overkill for solo; no timeline reflection |
| **Jira** | Powerful issue tracking, enterprise integrations | Complex, slow, not solo-friendly |
| **Notion** | Flexible, all-in-one | No structure, no gamification, generic |
| **ClickUp** | Feature-rich, everything app | Overwhelming for solo builders |
| **GitHub Projects** | Native GitHub integration | Minimal, no journal, no AI insights |
| **Trello** | Simple kanban | No timeline, no GitHub integration, no AI |

### GitShipDone Differentiators

- **Timeline-first**: Every change is preserved — users can scroll back through their project's history
- **AI PM copilot**: Not generic tips — AI that knows your project type, milestones, and current progress
- **GitHub changelog**: Automatic changelog generation from commits and releases
- **Project types**: Software projects get infrastructure/CI/CD/OAuth milestone templates; other types get AI guidance
- **Solo-first UX**: Built for one person managing many projects, not for managing teams
- **Points & gamification**: Progress feels rewarding, not just functional
- **Easy sharing**: One-click read-only public URLs — no account needed to view

---

## 4. Core Features & Functional Requirements

### 4.1 Authentication

- TASK-1: Users can register with email and password
- TASK-2: Users can log in with Google OAuth
- TASK-3: Users can log in with GitHub OAuth
- TASK-4: Users can reset their password via email
- TASK-5: JWT-based session management with refresh tokens; sessions persist 30 days
- TASK-6: Users can connect their GitHub account separately (for changelog integration) from their login method

### 4.2 Projects

- TASK-7: Users can create a project with a name, description (vision), and project type
- TASK-8: Project types: `software`, `design`, `physical`, `content`, `learning`, `other`
- TASK-9: Software projects show a milestone template wizard (OAuth, CI/CD, infra, deployment)
- TASK-10: Non-software projects surface AI-generated milestone suggestions via the selected AI provider
- TASK-11: Users can edit project name, description, type, and status at any time
- TASK-12: Project status: `active`, `on_hold`, `completed`, `archived`
- TASK-13: Users can delete a project (soft delete with 30-day recovery window)
- TASK-14: Project dashboard shows: name, type, status, progress %, current points, active milestones, recent updates
- TASK-15: Users can view a list of all their projects with summary cards (name, progress, last updated, type badge)

### 4.3 Milestones & Goals

- TASK-16: Users can create milestones with a name, description, due date, and status (`pending`, `in_progress`, `completed`)
- TASK-17: Milestones can have child goals (sub-tasks) with their own completion state
- TASK-18: Completing a milestone awards points automatically
- TASK-19: Milestones appear on the project timeline
- TASK-20: Users can reorder milestones via drag-and-drop
- TASK-21: Users can mark a milestone complete, which triggers a timeline event and point award

### 4.4 To-Do Items

- TASK-22: Users can add to-do items to a project with a title and optional due date
- TASK-23: Completing a to-do item increases project progress and awards points
- TASK-24: Unchecking a to-do item decreases progress and deducts points
- TASK-25: To-do items can be grouped by milestone
- TASK-26: Users can reorder to-do items via drag-and-drop
- TASK-27: To-do items can be marked as `urgent` (surfaced in reminders)

### 4.5 Journal / Update Log

- TASK-28: Users can create journal entries (rich text: bold, italic, lists, links, code blocks)
- TASK-29: Each journal entry has a title, body, and mood tag (`excited`, `blocked`, `steady`, `win`, `learning`)
- TASK-30: Journal entries appear on the project timeline sorted by date
- TASK-31: Users can edit and delete their own journal entries
- TASK-32: Journal entries are visible on the shared read-only project page

### 4.6 Points System

- TASK-33: Each project has a points total that auto-calculates based on activity
- TASK-34: Point awards:
  - Complete a to-do: +10 pts
  - Complete a milestone: +50 pts
  - Add a journal entry: +5 pts
  - Push a GitHub commit (via integration): +2 pts per commit
  - Create a GitHub release: +25 pts
- TASK-35: Points deducted when to-dos are unchecked: -10 pts
- TASK-36: Users can manually add or subtract points with a reason note (manual override)
- TASK-37: Points history is tracked with timestamps and reasons (visible in timeline)
- TASK-38: Projects have a level system based on total points (e.g., Seed → Sprout → Growing → Shipping → Launched)

### 4.7 Progress Tracking

- TASK-39: Project progress % auto-calculates: `(completed_todos / total_todos) * 100`
- TASK-40: If there are no to-dos, progress defaults to 0%
- TASK-41: Users can manually set a progress override (e.g., "I'm actually 80% done")
- TASK-42: Manual override is stored separately; system shows both auto and manual values
- TASK-43: Progress history is tracked in the timeline (each change logged with timestamp)

### 4.8 Timeline View

- TASK-44: Each project has a dedicated timeline page showing all events in chronological order
- TASK-45: Timeline events include: journal entries, milestone completions, to-do bulk completions, GitHub commits/releases, progress changes, point changes, project status changes
- TASK-46: Timeline supports filtering by event type (journal, milestone, GitHub, progress, points)
- TASK-47: Timeline is paginated or virtualized for performance (50 events per page)
- TASK-48: Timeline shows relative timestamps ("3 days ago") with absolute on hover
- TASK-49: Timeline is the primary view for the read-only shared page

### 4.9 GitHub Integration

- TASK-50: Users can connect a GitHub account via GitHub OAuth App (separate from login GitHub OAuth)
- TASK-51: Users can link a specific GitHub repository to a project
- TASK-52: On connection, the system imports the last 90 days of commits and releases
- TASK-53: After connection, the system polls for new commits/releases every 60 minutes (or on webhook)
- TASK-54: Commits are displayed on the timeline with SHA, message, author, and timestamp
- TASK-55: GitHub releases auto-generate a changelog entry grouping commits since the last release
- TASK-56: AI can summarize a set of commits into a human-readable changelog (optional, requires AI API key)
- TASK-57: Users can disconnect the GitHub repository from a project at any time
- TASK-58: GitHub data is stored locally in the database (not fetched live on page load)

### 4.10 AI Features (Virtual PM & Project Manager)

- TASK-59: Users can configure their AI provider in settings (OpenAI or Anthropic) with their own API key
- TASK-60: API keys are encrypted at rest using AES-256
- TASK-61: AI PM panel is available on each project page — users can ask questions in a chat interface
- TASK-62: AI has project context injected: type, vision, milestones, recent journal entries, progress, todos
- TASK-63: AI suggests next milestones based on project type and current progress
- TASK-64: AI generates pathway suggestions for parking lot ideas (how to get from idea → feature)
- TASK-65: For software projects, AI suggests relevant infrastructure milestones (e.g., "Set up CI/CD before shipping")
- TASK-66: AI can generate a changelog summary from recent GitHub commits
- TASK-67: AI responses are not stored server-side (stateless per request, context rebuilt each time)

### 4.11 Parking Lot

- TASK-68: Users can add ideas to a project's parking lot (title + optional description)
- TASK-69: Each parking lot item can have AI generate a "pathway" — a step-by-step plan to implement it
- TASK-70: Parking lot items can be promoted to milestones or to-dos
- TASK-71: Parking lot items can be archived or deleted

### 4.12 Alerts & Reminders

- TASK-72: Users can set reminder preferences per project (none, daily digest, milestone-specific)
- TASK-73: In-app notification center (bell icon) shows upcoming milestone due dates, overdue items, and system events
- TASK-74: Email reminders sent 3 days before and on the day of a milestone or to-do due date
- TASK-75: Reminders only fire if the item is not yet completed
- TASK-76: Users can snooze or dismiss in-app notifications
- TASK-77: Email unsubscribe link included in all reminder emails (CAN-SPAM compliant)

### 4.13 Project Sharing

- TASK-78: Each project can be toggled to "public" to generate a shareable read-only URL
- TASK-79: Shareable URL format: `/share/:shareToken` where `shareToken` is a random UUID
- TASK-80: Shared page displays: project overview (name, type, vision, progress, status, points/level), timeline, journal entries, milestone list, todo list
- TASK-81: Shared page does not display: AI chat, parking lot, private notes, settings
- TASK-82: Users can revoke a shared URL (generates a new token, old URL stops working)
- TASK-83: Shared pages are publicly accessible — no login required to view

### 4.14 User Settings

- TASK-84: Users can update their display name, avatar (upload or URL), and email
- TASK-85: Users can change their password (requires current password confirmation)
- TASK-86: Users can configure AI provider: OpenAI (GPT-4o) or Anthropic (Claude)
- TASK-87: Users can enter and update their AI API key (stored encrypted)
- TASK-88: Users can set global notification preferences (email enabled/disabled, digest frequency)
- TASK-89: Users can delete their account (soft delete, 30-day recovery)

---

## 5. Non-Goals (v1)

- Multi-user collaboration or team workspaces
- Real-time live updates / collaborative editing
- Native mobile app (iOS/Android)
- Billing or subscription management (MVP is free)
- Slack or Discord integrations
- Custom webhook support for external tools
- GitLab or Bitbucket integration (GitHub only in v1)

---

## 6. Key User Flows

### Flow 1: New User Onboarding
1. User lands on marketing/home page → clicks "Get Started"
2. Signs up with email/password or OAuth (Google or GitHub)
3. Lands on empty projects dashboard with a "Create your first project" CTA
4. Completes project creation wizard (name → type → vision → optional milestone templates)
5. Lands on project dashboard

### Flow 2: Create a Project
1. User clicks "New Project" from dashboard or sidebar
2. Enters project name and selects type
3. Writes a vision/description (optional, can skip)
4. If software type: offered predefined milestone templates (CI/CD, Auth, Deploy)
5. If other type: AI suggests 3 starter milestones (requires API key, skippable)
6. Project is created, user lands on project dashboard

### Flow 3: Daily Update Flow
1. User opens a project
2. Clicks "Log Update" → writes a journal entry (title + body + mood tag)
3. Marks 1-2 to-dos complete → progress bar updates, points increment
4. Sees the day's activity appear on the timeline in real-time

### Flow 4: Milestone Completion
1. User opens milestone detail
2. Marks all child goals complete
3. Clicks "Complete Milestone"
4. System logs timeline event, awards 50 points, updates level if threshold crossed
5. Confetti/celebration animation shown

### Flow 5: GitHub Integration Setup
1. User opens project settings → "Connect GitHub"
2. Redirected to GitHub OAuth authorization
3. Returns to app, selects repository from dropdown
4. System imports last 90 days of commits
5. Commits appear on project timeline

### Flow 6: Share a Project
1. User opens project settings → "Sharing"
2. Toggles project to "Public"
3. System generates share URL
4. User copies and shares link
5. Recipient views read-only project page without logging in

### Flow 7: AI PM Consultation
1. User opens project → clicks AI PM panel
2. If no API key: prompted to add one in settings
3. Types a question (e.g., "What should I work on next?")
4. AI responds with context-aware suggestions based on project state
5. User can act on suggestion (e.g., "Create milestone from this")

---

## 7. Technical Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Routing**: React Router v6
- **State management**: Zustand (global) + TanStack Query (server state)
- **Forms**: React Hook Form + Zod
- **Rich text editor**: Tiptap
- **Drag and drop**: dnd-kit
- **Animations**: Framer Motion
- **Date utilities**: date-fns

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **ORM**: Drizzle ORM (type-safe, lightweight)
- **Validation**: Zod
- **Auth**: Passport.js (Local, Google OAuth, GitHub OAuth) + JWT (access token 15min, refresh token 30 days)
- **Email**: Resend (transactional email)
- **Scheduling**: node-cron (reminder emails, GitHub polling)
- **File uploads**: Multer + local storage (or S3-compatible in production)

### Database
- **Primary**: PostgreSQL 15+
- **Migrations**: Drizzle Kit

### AI Integration
- **OpenAI SDK**: `openai` npm package
- **Anthropic SDK**: `@anthropic-ai/sdk` npm package
- **Provider**: User-configured at runtime, key stored encrypted in DB

### GitHub Integration
- **Auth**: GitHub OAuth App (separate from login)
- **API**: GitHub REST API v3 (Octokit)
- **Polling**: node-cron every 60 minutes per connected repo

### Infrastructure / DevOps
- **Local dev**: Docker Compose (PostgreSQL, optional Redis for future use)
- **Environment config**: dotenv
- **Build**: Vite (frontend), tsc (backend)

---

## 8. Conceptual Data Model

### users
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | |
| name | VARCHAR(255) | |
| avatar_url | TEXT | |
| password_hash | TEXT | nullable (OAuth users) |
| github_id | VARCHAR | nullable |
| google_id | VARCHAR | nullable |
| github_access_token | TEXT | encrypted, for GitHub API calls |
| ai_provider | ENUM('openai','anthropic') | nullable |
| ai_api_key | TEXT | encrypted |
| email_notifications_enabled | BOOLEAN | default true |
| created_at | TIMESTAMP | |
| deleted_at | TIMESTAMP | nullable (soft delete) |

### projects
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| name | VARCHAR(255) | |
| description | TEXT | vision statement |
| type | ENUM | software, design, physical, content, learning, other |
| status | ENUM | active, on_hold, completed, archived |
| progress_auto | INTEGER | 0-100, calculated |
| progress_manual | INTEGER | nullable, user override |
| points_total | INTEGER | default 0 |
| level | VARCHAR(50) | Seed, Sprout, etc. |
| share_token | UUID | nullable, unique |
| is_public | BOOLEAN | default false |
| github_repo_id | VARCHAR | nullable |
| github_repo_name | VARCHAR | nullable |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| deleted_at | TIMESTAMP | nullable |

### milestones
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| project_id | UUID FK → projects | |
| name | VARCHAR(255) | |
| description | TEXT | |
| status | ENUM | pending, in_progress, completed |
| due_date | DATE | nullable |
| sort_order | INTEGER | for drag-and-drop ordering |
| completed_at | TIMESTAMP | nullable |
| created_at | TIMESTAMP | |

### todos
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| project_id | UUID FK → projects | |
| milestone_id | UUID FK → milestones | nullable |
| title | VARCHAR(500) | |
| is_completed | BOOLEAN | default false |
| is_urgent | BOOLEAN | default false |
| due_date | DATE | nullable |
| sort_order | INTEGER | |
| completed_at | TIMESTAMP | nullable |
| created_at | TIMESTAMP | |

### journal_entries
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| project_id | UUID FK → projects | |
| title | VARCHAR(500) | |
| body | TEXT | rich text / JSON (Tiptap) |
| mood | ENUM | excited, blocked, steady, win, learning |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| deleted_at | TIMESTAMP | nullable |

### timeline_events
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| project_id | UUID FK → projects | |
| type | ENUM | journal, milestone, todo_batch, github_commit, github_release, progress_change, points_change, status_change |
| ref_id | UUID | nullable, FK to source record |
| payload | JSONB | event-specific data |
| created_at | TIMESTAMP | |

### points_log
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| project_id | UUID FK → projects | |
| delta | INTEGER | positive or negative |
| reason | VARCHAR(255) | auto-generated or user note |
| source | ENUM | todo, milestone, journal, github_commit, github_release, manual |
| created_at | TIMESTAMP | |

### parking_lot_items
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| project_id | UUID FK → projects | |
| title | VARCHAR(500) | |
| description | TEXT | nullable |
| ai_pathway | TEXT | nullable, AI-generated steps |
| archived_at | TIMESTAMP | nullable |
| created_at | TIMESTAMP | |

### github_commits
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| project_id | UUID FK → projects | |
| sha | VARCHAR(40) UNIQUE | |
| message | TEXT | |
| author_name | VARCHAR(255) | |
| committed_at | TIMESTAMP | |
| url | TEXT | |

### github_releases
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| project_id | UUID FK → projects | |
| tag_name | VARCHAR(255) | |
| name | VARCHAR(255) | |
| body | TEXT | raw release notes |
| ai_summary | TEXT | nullable |
| published_at | TIMESTAMP | |
| url | TEXT | |

### notifications
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| project_id | UUID FK → projects | nullable |
| type | ENUM | milestone_due, todo_due, milestone_completed, system |
| message | TEXT | |
| is_read | BOOLEAN | default false |
| snoozed_until | TIMESTAMP | nullable |
| created_at | TIMESTAMP | |

### refresh_tokens
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| token_hash | TEXT | bcrypt hash |
| expires_at | TIMESTAMP | 30 days |
| created_at | TIMESTAMP | |

---

## 9. UI Design Principles

- **Shadcn/ui** component library throughout — consistent, accessible, themeable
- **Light and dark mode** support via Tailwind CSS dark mode classes
- **Layout**: Left sidebar (projects list + nav) + main content area
- **Dashboard**: Card-based project grid with progress indicators and level badges
- **Timeline**: Vertical timeline component with event type icons and color-coded entries
- **Mobile-responsive**: All views work on mobile (stacked layout on narrow screens)
- **WCAG 2.1 AA**: Keyboard navigation, sufficient color contrast, ARIA labels, screen reader support
- **Celebration moments**: Confetti animation on milestone completion and level-up events
- **Empty states**: Illustrated, actionable empty states on all empty list views
- **Loading states**: Skeleton loaders on data-heavy views (timeline, dashboard)

### Key Screens

1. **Landing/Marketing page** — Hero, feature highlights, CTA
2. **Auth pages** — Login, Register, Forgot Password
3. **Projects Dashboard** — Grid of project cards
4. **Project Detail** — Tabs: Overview, Timeline, Milestones, Todos, Journal, Parking Lot, Settings
5. **Timeline page** — Full project history with filters
6. **AI PM panel** — Chat drawer/sidebar within project
7. **Settings page** — Profile, AI config, notifications, account
8. **Public share page** — Read-only project view (no auth required)

---

## 10. Security Considerations

- TASK-SEC-1: Passwords hashed with bcrypt (cost factor 12)
- TASK-SEC-2: JWT access tokens expire in 15 minutes; refresh tokens in 30 days
- TASK-SEC-3: Refresh tokens are stored as bcrypt hashes, not plaintext
- TASK-SEC-4: AI API keys encrypted at rest with AES-256-CBC; IV stored alongside ciphertext
- TASK-SEC-5: GitHub access tokens encrypted at rest
- TASK-SEC-6: All API endpoints require authentication except: `/api/auth/*` and `/api/share/:token`
- TASK-SEC-7: Share tokens are UUID v4 (128-bit random) — not guessable
- TASK-SEC-8: Rate limiting on auth endpoints: 5 failed attempts → 15-minute lockout
- TASK-SEC-9: Input sanitization on all user-provided content before storage
- TASK-SEC-10: CORS configured to allow only the frontend origin
- TASK-SEC-11: Helmet.js for HTTP security headers
- TASK-SEC-12: SQL injection prevention via Drizzle ORM parameterized queries
- TASK-SEC-13: XSS prevention: rich text content sanitized with DOMPurify on render

---

## 11. Development Phases

### Phase 1 — Foundation (MVP Core)
- Docker Compose setup (PostgreSQL)
- Database schema + migrations
- Auth system (email/password + Google + GitHub OAuth)
- Project CRUD
- Milestone + to-do CRUD
- Journal entries
- Basic timeline view
- Points system (auto-calculation)
- Progress tracking

### Phase 2 — Value Layer
- GitHub integration (OAuth + repo linking + commit/release import)
- AI PM panel (multi-provider)
- Parking lot with AI pathways
- Project sharing (read-only public URLs)
- Alerts & reminders (in-app notifications + email)

### Phase 3 — Polish
- Project type templates (software milestone wizard)
- Level system + celebration animations
- Dark mode
- WCAG 2.1 AA audit and fixes
- Performance optimization (virtualized timeline)
- Landing/marketing page

---

## 12. Assumptions & Dependencies

- Users are primarily English-speaking (no i18n in v1)
- OpenAI and Anthropic APIs are available and user has a valid API key for AI features
- GitHub OAuth App credentials are configured in environment variables
- Google OAuth credentials are configured in environment variables
- Resend (email service) is configured with a verified domain
- Production deployment is out of scope for this PRD (focus on local dev with Docker)
- The app is single-tenant (one account per email, no shared workspaces)
- File uploads (avatars) are stored locally in v1 (no S3 in MVP)
- Browser push notifications are deferred to a later phase

---

*PRD Progress:*
- [x] Gather all required information via questioning
- [x] Create executive summary for user validation
- [x] Get user confirmation to proceed
- [x] Research competitive landscape
- [x] Generate comprehensive PRD
- [ ] Present and gather feedback
- [ ] Iterate based on feedback
