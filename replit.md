# Neopay

A logistics/fintech web app with role-based dashboards for clients, affiliates, agents, and admins — handling package tracking, payments, deposits, withdrawals, and affiliate commissions.

## Run & Operate

- **Dev**: `npm run dev` (starts Express + Vite middleware on port 5000)
- **Build**: `npm run build` (Vite production build to `/dist`)
- **Typecheck**: `npm run lint`

### Required env vars / secrets
| Key | Purpose |
|-----|---------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK JSON (server-side Firestore access) |
| `SMTP_USER` | Gmail address for registration notification emails (optional) |
| `SMTP_PASS` | Gmail app password for SMTP (optional) |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA v2 secret for server-side verification (optional) |

## Stack

- **Frontend**: React 19, Vite 6, Tailwind CSS 4, shadcn/ui primitives, Recharts, Framer Motion
- **Backend**: Express 4, Firebase Admin SDK 13, Nodemailer
- **Database**: Cloud Firestore (custom DB: `ai-studio-283d6370-7e1a-484a-aed2-4d5b3071d1e2`)
- **Auth**: Firebase Auth (client SDK) + custom role resolution via Firestore
- **Runtime**: Node 20, tsx (TypeScript runner)

## Where things live

- `server.ts` — Express server + all `/api/*` routes (1170+ lines)
- `src/App.tsx` — Role-based routing state machine (home/admin/affiliate/agent/client)
- `src/lib/firebase.ts` — Firebase client SDK init
- `src/hooks/useAuth.ts` — Firebase Auth role detection
- `src/components/` — Role dashboards (Admin, Affiliate, Agent, Client) + shared views
- `firebase-applet-config.json` — Firebase client config (public, committed)
- `firestore.rules` — Firestore security rules

## Architecture decisions

- **Single Express server serves both API and frontend**: In dev, Vite runs in middleware mode attached to the Express HTTP server. In prod, Express serves the built `/dist` static files.
- **Firebase Admin SDK only on server**: All privileged Firestore writes (balance mutations, transaction records, notifications) go through `/api/*` Express routes using the Admin SDK — never directly from the browser.
- **Custom Firestore database**: Uses a named Firestore database (not `(default)`) — the ID is in `firebase-applet-config.json` and hardcoded in `server.ts`.
- **Role auth is custom**: No Firebase Auth sign-in for most roles. Admin/affiliate/agent log in with credentials checked against Firestore collections. Only clients may use Firebase Auth.
- **Graceful degradation**: SMTP and reCAPTCHA are optional — server warns and skips when keys are absent.

## Product

- **Home**: Service showcase, package tracking lookup, product/service carousel
- **Client dashboard**: Balance, deposit/withdrawal requests, purchase history, PDF statements
- **Affiliate dashboard**: Referral network, commissions, team sales tracking
- **Agent dashboard**: Client management, transaction oversight
- **Admin dashboard**: Full transaction management, notification center, approve/decline operations, formation management (CRUD)
- **Formations**: Online course catalog with beautiful cards, purchase via Wallet, modules/chapters/resources, certificates
- **Shipping view**: Shipping service information
- **Tracking view**: Package tracking by ID

## User preferences

- App is in French (UI language)
- Keep Firebase as the auth and database layer — do not migrate to Replit DB or Replit Auth

## Gotchas

- `adminDb` points to a **named** Firestore database — passing only `getFirestore(adminApp)` without the DB ID will hit the wrong database
- HMR websocket uses `REPLIT_DEV_DOMAIN` with `wss://` on port 443 for Replit preview compatibility
- The `FIREBASE_SERVICE_ACCOUNT` JSON may need a leading `{` prepended — the server handles this edge case
- Vite file watcher excludes `.local/**` and `.cache/**` to prevent Replit system files from triggering constant page reloads
- `online_sub_services` and `formations` are served via Express Admin SDK routes — NOT via client-side Firestore SDK — to bypass security rules
- Client deposit/withdrawal dialogs include optional custom message (max 300 chars) appended to WhatsApp pre-fill

## Pointers

- Firebase Console: https://console.firebase.google.com/project/gen-lang-client-0739219145
- Firestore rules: `firestore.rules`
