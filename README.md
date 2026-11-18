# Kaj Ache — Web Platform

**Kaj Ache** ("there is work") is a two-sided service marketplace for Bangladesh that connects customers with skilled technicians (plumbers, electricians, AC repair, painters and more). Customers post a job, technicians bid on it, the customer picks a bid, pays, and tracks the technician live on a map until the work is done.

This repository is the **web client**: the public landing site plus full customer and technician dashboards, built as a single-page React app on top of a REST backend shared with the mobile app.

![Kaj Ache landing page](docs/screenshots/home.png)

---

## Highlights

- **Bid-based marketplace flow** — post a gig → receive bids → chat with technicians → select a bid → pay → track → complete → review.
- **Three job types** — scheduled gigs, instant (urgent) services, and long-term recruitment requests, each with its own lifecycle.
- **Live technician tracking** — technicians share GPS from the browser; customers see the position and job location on a Leaflet/OpenStreetMap map.
- **Role-based dashboards** — separate, route-protected areas for customers and technicians.
- **Bilingual (Bangla / English)** — full i18n with CMS-driven overrides, Bangla as default.
- **CMS-driven landing page** — banners, categories, FAQs, social links and page copy come from the admin panel.
- **Local payments** — bKash / Nagad checkout flow with transaction-ID confirmation and system-fee payments.
- **In-app support** — support chat widget and complaint/report flow.

---

## Tech Stack

| Area | Technology |
| --- | --- |
| UI | React 19, JSX, functional components + hooks |
| Build | Vite 8 (`@vitejs/plugin-react`), dev proxy for `/api` and `/uploads` |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Routing | React Router v7 (`createBrowserRouter`, data-router `lazy` routes) |
| Maps | Leaflet + React Leaflet, OpenStreetMap tiles, browser Geolocation API |
| Rich text | Tiptap 3 (StarterKit, Link, Underline, Highlight, TextAlign) |
| Security | DOMPurify for CMS HTML, custom URL allow-listing |
| Analytics | Firebase Analytics (lazy, feature-detected) |
| UI extras | lucide-react icons, SweetAlert2 dialogs |
| Quality | ESLint 10 with `react-hooks` and `react-refresh` rules |

---

## Architecture

```
src/
├── main.jsx                 # App bootstrap: providers + RouterProvider
├── router/                  # Route tree, protected + lazy-loaded routes
├── context/                 # AuthContext, LanguageContext
├── hooks/                   # useLanguage, useLiveAccount, usePagedList
├── services/
│   ├── api.js               # Single API layer (fetch wrapper, normalizers)
│   └── servicesData.js      # Offline fallback catalogue
├── views/                   # Route-level pages (public + dashboards)
├── features/
│   ├── home/                # Landing page sections (hero, categories, FAQ, ...)
│   └── auth/                # Role-specific join flows
├── components/
│   ├── auth/                # ProtectedRoute
│   ├── dashboard/           # Bid chat, payment modals, post modals, reviews
│   ├── maps/                # LocationPickerMap, LiveTrackingMap
│   ├── support/             # Support chat widget, complaint modal
│   ├── layout/              # Navbar, Footer, mobile bottom nav, dashboard shell
│   └── ui/                  # Shared UI primitives (RichTextEditor, icons, ...)
├── locales/                 # en.js / bn.js translation dictionaries
├── config/                  # Firebase + app links
└── utils/                   # sanitizing, safe links, storage, role resolution
```

### Routing and code splitting

- Public routes: home, services, service/category details, about, contact, login/register/forgot-password.
- `/dashboard/customer/*` and `/dashboard/technician/*` are wrapped in a `ProtectedRoute` that checks the token **and** the stored role, redirecting to the correct join page otherwise.
- Every non-critical view uses React Router's `lazy()` route API, so each dashboard page ships as its own chunk and is only downloaded when visited.

### API layer (`src/services/api.js`)

All backend calls go through one module (~60 endpoint functions) instead of being scattered across components:

- **`authenticatedRequest` / `authenticatedList`** — attach the bearer token, parse JSON safely, and throw errors carrying the HTTP `status` so callers can react (e.g. stop polling on `403`).
- **Central 401 handling** — any `401` clears the stored session and dispatches an `auth:expired` DOM event; `AuthContext` listens and logs the user out, so expiry is handled in one place.
- **Response normalization** — backend data comes in mixed shapes (`EN/BN` objects, `titleBn` fields, emoji icons, `_id` vs `id`). Normalizers map everything to one predictable shape for the UI.
- **Graceful degradation** — public content (services, FAQ, banners) falls back to bundled defaults when the backend is down, flagged with `isFallback` so the UI never links to placeholder IDs.
- **Multipart uploads** — gigs, instant services, recruitment posts and profile updates send photos via `FormData`.

### Authentication and session

- JWT stored client-side, with a **"Remember me"** option: session-only logins are marked and cross-checked against `sessionStorage`, so the token is dropped once the browser is closed.
- `AuthContext` keeps a lightweight cached profile for instant first paint, then refreshes the full profile from `/profile/me`.
- A **12-second heartbeat** keeps wallet balance and verification status fresh, but only while the tab is visible (`visibilitychange`), and is guarded with refs to prevent overlapping requests and re-render loops.
- Unsupported roles (e.g. admin tokens) are rejected instead of guessed.

### Near-real-time updates

The backend is REST-only, so the app uses **targeted, visibility-aware polling** tuned per screen:

| Feature | Interval |
| --- | --- |
| Bid chat messages | 3 s |
| Technician job details | 4 s |
| Live location / gig lists | 5 s |
| Instant & recruitment details | 8 s (stops once job reaches a final state) |
| Support chat | faster while open, slower while closed |

`usePagedList` is a reusable hook for paginated lists with "Load more": every refresh re-fetches all pages already loaded (in parallel) so the list does not shrink on the next poll, and polling stops automatically on a `403` (e.g. unapproved technician).

### Live location tracking

`LiveTrackingMap` has two modes:

- **Technician** — `navigator.geolocation.watchPosition` with high accuracy; updates are throttled to one upload per 5 s to save battery and bandwidth. Permission errors are handled and sharing switches off.
- **Customer** — polls the technician's last position, shows "updated X ago", auto-fits the map to both technician and destination, and offers a Google Maps directions link.

`LocationPickerMap` lets customers pin the exact job location when posting.

### Internationalization

- `LanguageContext` provides `BN` / `EN` dictionaries (~660 keys each) with Bangla as default.
- CMS content from `/landing-content/public` is **deep-merged** over the bundled translations, so admins can change copy without a redeploy.
- The selected language persists in `localStorage` and keeps `<html lang>` in sync for screen readers and SEO.

### Security

- All CMS-provided HTML is sanitized with **DOMPurify**; a hook forces `target="_blank"` + `rel="noopener noreferrer"` on links.
- `safeHref` allow-lists `http`, `https`, `mailto`, `tel` and internal paths, blocking `javascript:`, `data:` and protocol-relative URLs.
- Storage access is wrapped in `try/catch` so private/blocked-storage browsers do not crash the app.

### SEO and performance

- Open Graph and Twitter meta tags, `theme-color`, `robots.txt`.
- All images served as **WebP**, with separate mobile hero backgrounds.
- Lazy routes keep the initial bundle small; Firebase Analytics loads only when supported.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A running Kaj Ache backend (defaults to `http://localhost:3000`)

### Setup

```bash
npm install
```

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start dev server on `http://localhost:5174` (proxies `/api` and `/uploads` to the backend) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

---

## My Role

<!-- Edit this section to describe your own contribution. -->

- Built the web client end to end: architecture, routing, state management and API integration.
- Designed the bid → payment → tracking → review flows for customers and technicians.
- Implemented live GPS tracking, bilingual i18n with CMS overrides, and the security hardening around CMS content.

---

## Screenshots

<!-- Add screenshots, e.g. ![Home](docs/screenshots/home.png) -->