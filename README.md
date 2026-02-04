# SeedBay - Marketplace SaaS

Marketplace pour acheter et vendre des projets digitaux clés en main.

## 📋 Structure du Projet

```
src/
├── app/                          # Next.js 14 app directory
│   ├── layout.tsx               # Layout principal
│   ├── page.tsx                 # Page d'accueil
│   ├── api/
│   │   ├── health/route.ts      # Health check
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── orders/
│   │   └── payments/
│   └── dashboard/               # Espace utilisateur
├── lib/
│   └── auth.ts                  # Fonctions d'authentification
├── middleware.ts                # Middleware global
└── globals.css                  # Styles Tailwind
```

## 🚀 Démarrage Rapide

```bash
# Installation
npm ci

# Développement
npm run dev

# Build
npm run build

# Production
npm start
```

## 📚 Documentation

- [Démarrage](00-START-HERE.md)
- [README Complet](SEEDBAY-README.md)
- [Points Critiques](POINTS-CRITIQUES.md)
- [Guide de Déploiement](seedbay-deployment-guide.ts)

## 🔐 Sécurité

- PostgreSQL RLS (Row Level Security)
- JWT Authentication (Supabase)
- Stripe Webhook Validation
- Audit Logging complet
- Secrets masqués en production

## 📦 Technologies

- **Framework**: Next.js 14 + React 18
- **Database**: PostgreSQL + Supabase
- **Auth**: Supabase Auth
- **Payments**: Stripe
- **Hosting**: Vercel
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## 📧 Contact

Pour plus d'informations, consultez la documentation de déploiement.
