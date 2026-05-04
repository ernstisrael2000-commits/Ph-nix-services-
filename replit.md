# Neopay Logistics App

A React + Vite + Express web application for parcel tracking, logistics management, and e-learning — built for the Haitian market (French language UI).

## Architecture

- **Frontend**: React 19 + Vite 6 + TailwindCSS 4 + shadcn/ui components
- **Backend**: Express.js server (`server.ts`) serving Vite middleware in dev, static files in production
- **Database**: Firebase Firestore (custom database ID from `firebase-applet-config.json`)
- **Auth**: Firebase Auth with IndexedDB persistence (Google Sign-In enabled for Formations)
- **Storage**: Firebase Storage
- **AI**: Google Gemini API

## Project Structure

```
/
├── server.ts                  # Express server (port 5000) + Vite middleware
├── api/index.ts               # Production mirror of server.ts routes (keep in sync)
├── vite.config.ts             # Vite config with TailwindCSS, path aliases
├── firebase-applet-config.json  # Firebase project config
├── src/
│   ├── App.tsx                # Main app — view routing: home/tracking/admin/affiliate/shipping/agent/formations
│   ├── main.tsx               # React entry point
│   ├── types.ts               # All TypeScript types incl. Formation, FormationModule, FormationProgress, FormationPurchase
│   ├── components/
│   │   ├── formations/        # E-learning platform components
│   │   │   ├── FormationsView.tsx        # Root view (sub-nav, auth)
│   │   │   ├── FormationsPage.tsx        # Marketplace with search/filter
│   │   │   ├── FormationCard.tsx         # Premium card with progress
│   │   │   ├── FormationDetail.tsx       # Detail page: header, video, modules, PDF, buy modal
│   │   │   ├── VideoPlayer.tsx           # Locked/unlocked video player (YouTube, Vimeo, MP4)
│   │   │   ├── MyCourses.tsx             # User's purchased formations
│   │   │   └── FormationsAdminPanel.tsx  # Admin CRUD: formations, modules, purchases, stats
│   │   ├── AdminDashboard.tsx # Admin panel with "Formations" tab added
│   │   └── Navbar.tsx         # Top nav with "Formations" button
│   ├── services/
│   │   ├── formationService.ts  # Firestore hooks & functions for formations
│   │   └── ...                  # Other service layers
│   ├── hooks/                 # Custom hooks (useAuth)
│   └── lib/                   # Firebase init, utilities
```

## Key Features

- **Parcel Tracking**: Track shipments by ID
- **Admin Dashboard**: Manage parcels, affiliates, agents, settings, and now formations
- **Affiliate System**: Affiliate registration, login, and dashboard
- **Agent System**: Agent login and dashboard
- **Shipping**: Shipping request management
- **Global Announcements**: Admin-controlled announcements shown on load
- **Email Notifications**: SMTP via nodemailer for registration alerts
- **Client Wallet System**: Client registration/login, wallet dashboard with deposit/withdrawal
- **Product Payment with Balance**: "Pay with wallet balance" option in product detail modal
- **Admin Transaction Approvals**: Admin can approve/reject client deposits, withdrawals, purchases
- **reCAPTCHA v2**: On deposit and withdrawal forms (keys: RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY)
- **Formations E-Learning Platform** (full Udemy/Coursera-style):
  - Marketplace page with premium cards, search, level filters
  - Google Sign-In for formation users (Firebase Auth)
  - Formation detail: header, locked video player, module list, PDF resources
  - Progression system: per-module completion, % tracking, auto-save to Firestore
  - Purchase flow: WhatsApp-based payment request (MonCash/NatCash/Admi)
  - Admin panel: CRUD formations + modules, manage purchases (approve/revoke), statistics
  - Firestore collections: formations, formation_purchases, formation_progress, formation_users

## Firestore Collections

| Collection | Purpose |
|---|---|
| `formations` | Formation metadata, modules, published state |
| `formation_purchases` | User purchases (pending → active → revoked) |
| `formation_progress` | Per-user progress (completed modules + %) |
| `formation_users` | Google-authenticated formation user profiles |

## Running the App

```bash
npm run dev
```

Server runs on port 5000 (Express + Vite middleware).
**Important**: Kill port before restarting: `fuser -k 5000/tcp`

## Environment Variables / Secrets

- `RECAPTCHA_SITE_KEY` — Google reCAPTCHA v2 site key
- `RECAPTCHA_SECRET_KEY` — Google reCAPTCHA v2 secret key
- `FIREBASE_SERVICE_ACCOUNT` — Firebase Admin SDK service account JSON
- `GEMINI_API_KEY` — Google Gemini AI (optional)
- `SMTP_USER` / `SMTP_PASS` — Gmail for notifications (optional)

## Deployment

Configured for autoscale deployment:
- Build: `npm run build`
- Run: `npx tsx server.ts`

## Replit Migration Notes

- HMR configured via `vite.config.ts` to use `wss://` on port 443 with the `REPLIT_DEV_DOMAIN` env var
- Firebase Auth (Google Sign-In) is kept as-is — it's the user's own Firebase project
- Both `server.ts` AND `api/index.ts` must be kept in sync for all API routes
- SMTP email notifications gracefully skip if `SMTP_USER`/`SMTP_PASS` are not set

## Super Admin

Bootstrapped automatically on first load:
- Name: Ernst israel
- Login code: ER-2026
