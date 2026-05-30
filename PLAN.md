# PostPilot — Master Build Plan
Generated: 2026-05-29

## PHASE 1: AUDIT & STABILIZE (do first)

- [x] Fix all TypeScript errors (0 errors)
- [x] Fix all build errors (build passes clean)
- [x] Fix all import errors and missing modules
- [x] Landing page: email capture form writes to Supabase waitlist table
- [x] Verify Supabase client initializes without error (check .env.local)
- [x] Verify auth flow works: signup → email confirm → login → dashboard redirect
- [x] Verify Stripe webhook handler returns 200

## PHASE 2: COMPLETE MISSING FEATURES

- [x] Landing page: hero section with email capture form
- [x] Landing page: email capture writes to Supabase waitlist table
- [x] Landing page: comparison table PostPilot vs Hootsuite vs Buffer
- [x] Landing page: pricing section with working Stripe checkout buttons
- [x] Auth: magic link login working with Supabase
- [x] Dashboard: real data from Supabase (not placeholder/hardcoded)
- [x] Dashboard: session-aware (shows correct user name, subscription tier)
- [x] Compose: AI content generator calling OpenAI API and rendering 3 variations
- [x] Compose: platform character counter live updating as user types
- [x] Compose: schedule picker saving to posts table in Supabase
- [x] Calendar: renders posts from Supabase grouped by day
- [x] Calendar: click day → slide panel with post list (framer-motion Sheet)
- [x] Analytics: charts render with recharts using mock data
- [x] Accounts: platform connection modal saves to social_accounts table
- [x] Billing: plan display reads from subscriptions table
- [x] Billing: upgrade button creates Stripe checkout session
- [x] Settings: profile form saves to profiles table with success toast
- [x] All pages: loading skeletons (loading.tsx in all 7 dashboard routes)
- [x] All pages: error boundaries (error.tsx in all 8 routes including root)
- [x] All pages: empty states with helpful CTAs

## PHASE 3: TESTING INFRASTRUCTURE

- [x] Install Vitest + React Testing Library
- [x] Configure vitest.config.ts with jsdom environment
- [x] Write unit tests: AI generate API route (mock OpenAI, test response parsing)
- [x] Write unit tests: Stripe webhook handler (mock events, verify DB updates)
- [x] Write unit tests: subscription gate functions (checkPostLimit, checkAIAccess)
- [x] Write unit tests: date formatting utilities
- [x] Install Playwright (@playwright/test ^1.60.0 installed)
- [x] Write e2e test: landing page loads, CTA visible, pricing section present
- [x] Write e2e test: auth flow (signup → dashboard redirect)
- [x] Write e2e test: compose page AI generator button visible and clickable
- [x] Create playwright.config.ts
- [x] Run all tests: 37 unit + 9 e2e = 46 passing

## PHASE 4: PERFORMANCE OPTIMIZATION

- [x] Install bundle analyzer (@next/bundle-analyzer installed, Turbopack doesn't support it)
- [x] Analyzed chunks: 365KB, 236KB, 222KB (Turbopack manages code splitting automatically)
- [x] Extracted analytics charts into separate components (analytics-charts.tsx)
- [x] Dashboard routes all have loading.tsx (7 files exist)
- [x] Dashboard routes all have error.tsx (8 files including root)
- [x] Added metadata to root layout (OG, twitter cards, robots directives)
- [x] Added metadata to auth layouts (login, signup, reset)
- [x] Added robots.txt and sitemap.xml
- [x] Added JSON-LD structured data to landing page

## PHASE 5: FEATURE EXPANSION — AI UPGRADES

- [ ] AI Month Generator: /dashboard/ai-month
- [ ] AI Caption Optimizer: "Optimize" button per platform
- [ ] AI Hashtag Suggester
- [ ] Post Templates Library: /dashboard/templates
- [ ] Competitor Monitor: /dashboard/competitors
- [ ] Best Time Predictor: heatmap grid

## PHASE 6: POLISH & PRODUCTION HARDENING

- [ ] Add rate limiting to all API routes
- [ ] Add input validation with Zod on every API route
- [ ] Add proper HTTP status codes on all API errors
- [ ] Implement proper CORS headers
- [ ] Add robots.txt and sitemap.xml with next-sitemap
- [ ] Add structured data (JSON-LD) to landing page for SEO
- [ ] All forms: proper validation, disable button on submit, loading spinner
- [ ] Mobile responsiveness audit: test at 375px, 768px, 1024px
- [ ] Dark mode is default and only mode — remove any light mode remnants
- [ ] Keyboard navigation: every interactive element focusable, skip-to-content link

## PHASE 7: VIRAL & GROWTH FEATURES

- [ ] Public post showcase: /u/[username]
- [ ] Referral system: referral links + tracking
- [ ] Export as image: html2canvas
- [ ] WhatsApp sharing button
- [ ] Weekly email report: Supabase Edge Function + Resend
