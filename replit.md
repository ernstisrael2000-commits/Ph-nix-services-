# Neopay Logistics App

A React + Vite + Express web application for parcel tracking and logistics management, built for the Haitian market (French language UI).

## Architecture

- **Frontend**: React 19 + Vite 6 + TailwindCSS 4 + shadcn/ui components
- **Backend**: Express.js server (`server.ts`) serving Vite middleware in dev, static files in production
- **Database**: Firebase Firestore (custom database ID from `firebase-applet-config.json`)
- **Auth**: Firebase Auth with IndexedDB persistence
- **Storage**: Firebase Storage
- **AI**: Google Gemini API

## Project Structure

```
/
├── server.ts           # Express server (port 5000) + Vite middleware
├── vite.config.ts      # Vite config with TailwindCSS, path aliases
├── firebase-applet-config.json  # Firebase project config
├── src/
│   ├── App.tsx         # Main app with view routing (home/tracking/admin/affiliate/shipping/agent)
│   ├── main.tsx        # React entry point
│   ├── components/     # UI components (AdminDashboard, AffiliateDashboard, etc.)
│   ├── services/       # Firebase service layers (parcel, admin, affiliate, agent, analytics, clientService)
│   ├── hooks/          # Custom hooks (useAuth)
│   └── lib/            # Firebase init, utilities
```

## Key Features

- **Parcel Tracking**: Track shipments by ID
- **Admin Dashboard**: Manage parcels, affiliates, agents, settings
- **Affiliate System**: Affiliate registration, login, and dashboard
- **Agent System**: Agent login and dashboard
- **Shipping**: Shipping request management
- **Global Announcements**: Admin-controlled announcements shown on load
- **Email Notifications**: SMTP via nodemailer for registration alerts
- **Client Wallet System**: Client registration/login, wallet dashboard with deposit/withdrawal
- **Product Payment with Balance**: "Pay with wallet balance" option in product detail modal
- **Admin Transaction Approvals**: Admin can approve/reject client deposits, withdrawals, purchases

## Running the App

```bash
npm run dev
```

Server runs on port 5000 (Express + Vite middleware).

## Environment Variables

See `.env.example`:
- `GEMINI_API_KEY` - Google Gemini AI API key
- `APP_URL` - Hosted app URL
- `SMTP_USER` - Gmail address for notifications
- `SMTP_PASS` - Gmail App Password

## Deployment

Configured for autoscale deployment:
- Build: `npm run build`
- Run: `npx tsx server.ts`

## Replit Migration Notes

- HMR configured via `vite.config.ts` to use `wss://` on port 443 with the `REPLIT_DEV_DOMAIN` env var
- Firebase Auth (Google Sign-In) is kept as-is — it's the user's own Firebase project
- SMTP email notifications gracefully skip if `SMTP_USER`/`SMTP_PASS` are not set
- `GEMINI_API_KEY` is optional — AI features won't work without it

## Super Admin

Bootstrapped automatically on first load:
- Name: Ernst israel
- Login code: ER-2026
