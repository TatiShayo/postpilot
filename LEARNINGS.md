# PostPilot — Agent Learnings & Known Issues
Use this file to log: errors encountered, solutions found, things to avoid

## Environment
- Windows PowerShell: use npm commands directly, no shell-specific syntax needed
- git commands work directly on Windows
- Next.js 16.2.6 with Turbopack — different from Next.js 14/15
- Build output shows routes are correctly configured with proper SSR/static handling

## Architecture Notes
- Supabase SSR: server.ts uses cookies() for server components, client.ts uses createBrowserClient
- Stripe: stripe.ts initializes with STRIPE_SECRET_KEY
- Dashboard layout: server component with auth guard (redirect to /auth/login if no user)
- All dashboard pages are client components using createClient() from supabase client
- Error handling in API routes follows try/catch → 500 pattern (needs improvement for Phase 6)
