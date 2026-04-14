# Pedagomi Bot — Frontend Next.js

Interface web moderne pour gérer le bot de réservation des places d'examen RdvPermis.
**Design style Finary/Autovox, PWA installable, responsive, mode jour/nuit.**

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Database + Realtime)
- Framer Motion
- Déployé sur Vercel

## Structure

```
app/
├── login/              → page de connexion
├── (app)/              → layout protégé (user connecté)
│   ├── page.tsx        → Dashboard
│   ├── candidats/      → Gestion file d'attente
│   ├── reservations/   → Historique
│   └── parametres/     → Configuration
components/
├── brand/logo.tsx      → Logo SVG
├── layout/             → Sidebar + mobile nav
├── dashboard/          → Bot status + stat cards
└── ui/                 → Button, Card, Input, etc.
lib/
├── supabase/           → Clients (browser/server/middleware)
└── utils.ts
```

## Démarrage local

```bash
# 1. Copier l'env
cp .env.local.example .env.local
# (les valeurs par défaut pointent vers le projet Supabase pedagomi-bot-rdv)

# 2. Installer
npm install

# 3. Lancer
npm run dev
# → http://localhost:3000
```

## Déploiement Vercel

Voir `DEPLOIEMENT.md` à la racine du projet `Bot Place`.
