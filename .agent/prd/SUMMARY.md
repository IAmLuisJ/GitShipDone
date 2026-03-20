# GitShipDone — Project Summary

## Overview

GitShipDone is a solo-builder-first project tracking platform. Think of it as a personal project journal meets changelog generator meets AI product manager — built for developers and makers running multiple projects in parallel who are tired of Jira's complexity and Notion's lack of structure.

Users start a project with a vision, log updates, hit milestones, and watch their project's full history unfold in a beautiful timeline. Connect a GitHub repo and get automatic changelogs. Add ideas to a parking lot and let AI generate pathways to implement them. Share progress with anyone via a read-only public URL.

## Main Features

- **Projects** — Create projects with a name, type (software, design, physical, etc.), and vision statement
- **Milestones & Todos** — Set goals and track to-dos; progress auto-calculates from completion
- **Journal / Update Log** — Rich-text journal entries with mood tags to document the journey
- **Timeline View** — Full project history: journal entries, milestones, GitHub commits, progress changes, points
- **Points & Levels** — Gamified progress: earn points for todos, milestones, commits; level up from Seed to Launched
- **GitHub Integration** — Connect a repo via GitHub OAuth; auto-import commits and releases as timeline events; AI-summarized changelogs
- **AI PM Copilot** — Context-aware AI assistant (OpenAI or Anthropic, user API key) for next steps, milestone suggestions, parking lot pathways
- **Parking Lot** — Capture ideas; AI generates step-by-step implementation pathways; promote to milestones
- **Alerts & Reminders** — In-app notification center + email reminders for upcoming milestones and due dates
- **Project Sharing** — One-click read-only public URLs; viewers see timeline, overview, journal, and todos without logging in

## Key User Flows

1. **Onboarding** → Sign up → Create first project → Choose type → Set vision → Optional milestone templates
2. **Daily Update** → Open project → Log journal entry → Check off todos → Watch points and progress update
3. **Milestone Completion** → Complete all child goals → Mark milestone done → Points awarded → Timeline event logged
4. **GitHub Setup** → Project settings → Connect GitHub → Select repo → Commits appear on timeline
5. **Share Progress** → Project settings → Enable public → Copy link → Anyone can view without an account
6. **AI Consultation** → Open AI PM panel → Ask questions → AI responds with project-aware suggestions

## Key Requirements

- React + TypeScript + Tailwind CSS + shadcn/ui (frontend)
- Express.js + Node.js + Drizzle ORM (backend)
- PostgreSQL database
- Docker Compose for local development
- Email + Google + GitHub OAuth authentication
- AI: user-supplied API key (OpenAI GPT-4o or Anthropic Claude)
- GitHub OAuth App for repo integration
- WCAG 2.1 AA accessibility compliance
- Responsive design (desktop + mobile web)
