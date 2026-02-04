// ============================================================================
// SEEDBAY: ARCHITECTURE D'AUTHENTIFICATION & AUTORISATION
// Pattern: JWT + Supabase Auth + PostgreSQL RLS
// ============================================================================

/**
 * ============================================================================
 * PARTIE 1: FLUX D'AUTHENTIFICATION (SIGNUP & LOGIN)
 * ============================================================================
 */

/*
 * FLOW: SIGNUP (Nouvel utilisateur)
 * 
 * 1. Frontend (SignUp Form)
 *    ├─ Email + Password + Role (buyer/vendor) + Username
 *    └─ POST /api/auth/signup
 *
 * 2. Backend (/api/auth/signup)
 *    ├─ Valider input (email format, password strength)
 *    ├─ Appel Supabase Auth.signUp()
 *    │  └─ Crée auth.users record + JWT signé
 *    └─ Insérer profil utilisateur dans public.users
 *       ├─ id (from auth.uid())
 *       ├─ role (buyer ou vendor)
 *       ├─ email_verified_at = NULL (sera set après vérification)
 *       └─ INSERER LOGS AUDIT
 *
 * 3. Email de confirmation
 *    ├─ Supabase envoie magic link
 *    └─ Utilisateur clique → verify_email
 *
 * 4. Vérification d'email
 *    ├─ GET /callback?code=...&type=email_confirmation
 *    └─ Backend valide + update public.users.email_verified_at
 *
 * SÉCURITÉ:
 * - Password JAMAIS stocké côté app
 * - JWT signé par Supabase (non-falsifiable)
 * - Email verification OBLIGATOIRE pour achats
 */

/*
 * FLOW: LOGIN (Utilisateur existant)
 * 
 * 1. Frontend (Login Form)
 *    └─ POST /api/auth/login (email, password)
 *
 * 2. Backend
 *    ├─ Supabase Auth.signInWithPassword()
 *    ├─ Récupère JWT + refresh token
 *    └─ Stocke dans HTTP-Only Cookie (sécurisé)
 *
 * 3. JWT stocké en HTTP-Only Cookie
 *    └─ Automatiquement envoyé à chaque request
 *
 * SÉCURITÉ:
 * - HTTP-Only Cookie: JS ne peut pas accéder (XSS safe)
 * - Secure flag: HTTPS seulement en production
 * - SameSite=Strict: CSRF protection
 */

/**
 * ============================================================================
 * PARTIE 2: MODÈLE DE RÔLES & PERMISSIONS
 * ============================================================================
 */

const ROLES = {
  BUYER: 'buyer',      // Acheteur de projets
  VENDOR: 'vendor',    // Vendeur de projets
  ADMIN: 'admin',      // Administrateur plateforme
};

const PERMISSIONS = {
  // BUYER
  [ROLES.BUYER]: {
    projects: ['read_published', 'search', 'filter'],
    orders: ['create_order', 'download_files', 'review_project'],
    favorites: ['create', 'delete'],
    messages: ['send', 'read'],
  },

  // VENDOR
  [ROLES.VENDOR]: {
    projects: ['create', 'read_own', 'update_own', 'delete_draft', 'submit_review'],
    deliverables: ['upload', 'update', 'delete'],
    orders: ['view_own_sales', 'contact_buyer'],
    analytics: ['view_own_sales_data'],
    stripe: ['connect_account'],
  },

  // ADMIN
  [ROLES.ADMIN]: {
    users: ['read_all', 'update_role', 'ban_user'],
    projects: ['read_all', 'approve', 'reject', 'feature'],
    orders: ['read_all', 'refund'],
    analytics: ['view_platform_data'],
    audit: ['view_logs', 'export_data'],
  },
};

/**
 * ============================================================================
 * PARTIE 3: FLUX ACHAT SÉCURISÉ (ACHETEUR → PROJET → FICHIERS)
 * ============================================================================
 */

/*
 * ÉTAPE 1: ACHETEUR VISUALISE UN PROJET PUBLIÉ
 * 
 * Frontend: GET /projects/[id]
 * 
 * Politique RLS appliquée:
 *   ├─ "published_projects_readable"
 *   │  └─ SELECT WHERE status = 'published' (accès public)
 *   └─ Données retournées:
 *      ├─ title, description, price, tech_stack ✓
 *      ├─ deliverables (LISTE, pas contenu) ✓
 *      └─ stripe_account_id ✗ (JAMAIS exposé)
 * 
 * Backend: /api/projects/[id]
 *   ├─ SELECT * FROM projects WHERE id = $1
 *   └─ PostgreSQL applique RLS automatiquement
 *      └─ Retourne 0 rows si projet non-publié (permission denied)
 */

/*
 * ÉTAPE 2: ACHETEUR INITIE UN PAIEMENT
 * 
 * Frontend: POST /api/orders/create-intent
 * Body: { project_id, payment_method }
 * 
 * Backend: /api/orders/create-intent
 *   ├─ ✓ Vérifier auth.uid() == buyer_id
 *   ├─ ✓ Vérifier email_verified() = true
 *   ├─ ✓ Vérifier achat unique: NOT EXISTS (select 1 from orders where project_id = $1 and buyer_id = auth.uid())
 *   ├─ ✓ Vérifier projet existe et est publié
 *   ├─ ✓ Créer PaymentIntent Stripe
 *   │  └─ amount, customer, idempotency_key
 *   └─ ✓ Insérer order record avec status = 'pending'
 *      └─ INSERT INTO orders (project_id, buyer_id, seller_id, status, stripe_payment_intent_id)
 *         VALUES (...)
 *         WITH CHECK: buyer_id = auth.uid()
 *         └─ RLS Policy bloque si buyer_id != auth.uid()
 */

/*
 * ÉTAPE 3: PAIEMENT STRIPE
 * 
 * Frontend: Stripe Elements
 *   ├─ Affiche formulaire paiement
 *   └─ Envoie token au backend (JAMAIS stocker en clair)
 * 
 * Backend: /api/payments/confirm-intent
 *   ├─ Confirmer PaymentIntent
 *   └─ Stripe retourne: status = 'succeeded' || 'requires_action' || 'failed'
 */

/*
 * ÉTAPE 4: WEBHOOK STRIPE (CRITICAL)
 * 
 * Stripe envoie au backend: POST /api/payments/webhook
 * 
 * Événement: payment_intent.succeeded
 *   ├─ ✓ Valider signature webhook
 *   │  └─ Stripe signature est signée (non-falsifiable)
 *   ├─ ✓ Récupérer order via stripe_payment_intent_id
 *   ├─ ✓ Mettre à jour order.status = 'completed'
 *   │  └─ UPDATE orders SET status = 'completed' WHERE id = $1
 *   ├─ ✓ Logs audit
 *   └─ Stripe ne peut JAMAIS être contourné (vérification côté DB)
 * 
 * SÉCURITÉ CRITIQUE:
 * - Webhook vérification OBLIGATOIRE
 * - Jamais faire confiance au client pour status
 * - Idempotency: même webhook appelé 2x = même résultat
 */

/*
 * ÉTAPE 5: ACHETEUR TÉLÉCHARGE LES FICHIERS
 * 
 * Frontend: GET /projects/[id]/deliverables/download
 * 
 * Backend: /api/projects/[id]/deliverables/download
 *   ├─ Vérifier auth.uid() == buyer_id
 *   ├─ Vérifier order.status = 'completed'
 *   ├─ Récupérer deliverables via RLS
 *   │  └─ SELECT * FROM deliverables WHERE project_id = $1
 *   │     └─ RLS: "paid_buyer_see_deliverables"
 *   │        └─ Policy bloque si pas de commande complétée
 *   ├─ Pour chaque fichier:
 *   │  ├─ Générer URL signée (5 min d'expiration)
 *   │  └─ URL: supabase.storage.from('deliverables').createSignedUrl(path, 300)
 *   └─ Insérer log download
 *      └─ INSERT INTO downloads (order_id, deliverable_id, ...)
 * 
 * SÉCURITÉ:
 * - Fichiers en storage PRIVÉ (pas d'accès public)
 * - URL signées: expiration courte + signature Supabase
 * - Impossible de deviner/forcer URL (GUID + signature)
 * - RLS bloque même si URL trouvée: user_id != buyer_id
 */

/**
 * ============================================================================
 * PARTIE 4: MIDDLEWARE D'AUTHENTIFICATION (Next.js)
 * ============================================================================
 */

// middleware.ts
/*
 * Middleware appliqué à TOUTES les routes /api
 * 
 * Flux:
 * 1. Récupérer JWT du cookie
 * 2. Vérifier signature (Supabase fait automatiquement)
 * 3. Injecter auth.uid() dans req context
 * 4. Si request vers route protégée sans auth → 401
 */

/**
 * ============================================================================
 * PARTIE 5: SÉCURITÉ DU STOCKAGE DE FICHIERS
 * ============================================================================
 */

/*
 * STRUCTURE SUPABASE STORAGE:
 * 
 * seedbay-bucket (PRIVATE)
 * ├── projects/[project_id]/deliverables/
 * │   ├── code/
 * │   │   └── [uuid]-source.zip
 * │   ├── documents/
 * │   │   └── [uuid]-readme.pdf
 * │   └── ...
 * └── tmp/ (uploads en cours)
 * 
 * RÈGLES:
 * - Aucun fichier public
 * - Path naming: [uuid] (impossible de deviner)
 * - Antivirale scan AVANT acceptation (futur)
 * - Quota: 100MB/projet max
 */

/*
 * UPLOAD FICHIER (Vendeur)
 * 
 * Frontend: PUT /api/projects/[id]/upload
 * 
 * Backend:
 *   ├─ Vérifier seller_id = auth.uid()
 *   ├─ Valider size < 100MB
 *   ├─ Générer UUID pour filename
 *   └─ Uploader via Supabase Storage
 *      ├─ Utiliser server-side SDK (clé privée)
 *      └─ Stocker path en DB
 * 
 * SÉCURITÉ:
 * - Server-side upload seulement (pas client direct)
 * - Clé d'accès privée jamais exposée en frontend
 * - Scan virus (future intégration)
 */

/**
 * ============================================================================
 * PARTIE 6: PROTECTION CONTRE LES MENACES COURANTES
 * ============================================================================
 */

const SECURITY_THREATS = {
  // THREAT 1: Utilisateur essaie de voir les fichiers d'un projet qu'il n'a pas acheté
  THREAT: "Accès non-autorisé aux livrables",
  SCENARIO: "GET /api/projects/123/deliverables sans avoir acheté",
  DEFENCE: [
    "✓ RLS Policy: has_purchased_project(project_id) check",
    "✓ Backend verify: SELECT ... WHERE project_id = $1 AND buyer_id = auth.uid()",
    "✓ Signed URLs: peuvent être brute-forcées mais signature Supabase invalide sans clé",
  ],
  IMPACT: "Haute - Accès aux contenus payants sans payer",
  RISK_LEVEL: "CRITICAL",

  // THREAT 2: Admin forgé, utilisateur change son rôle
  THREAT: "Escalade de privilèges (elevation)",
  SCENARIO: "User role = 'buyer', modifie JWT/DB pour role = 'admin'",
  DEFENCE: [
    "✓ Supabase Auth: JWT signé, non-modifiable côté client",
    "✓ RLS Policy on users: role ne peut être changé que par admin existant",
    "✓ Backend check: if (NEW.role != OLD.role && !isAdmin()) BLOCK",
  ],
  IMPACT: "Critique - Accès admin complet",
  RISK_LEVEL: "CRITICAL",

  // THREAT 3: Vendeur modifie sa commande pour marquer comme payée
  THREAT: "Bypass paiement",
  SCENARIO: "Vendor UPDATE orders SET status = 'completed' WHERE...",
  DEFENCE: [
    "✓ RLS Policy: orders UPDATE seulement si admin",
    "✓ Webhook validation: status changé que via Stripe webhook vérifié",
    "✓ Audit logs: chaque status change est loggé avec source",
  ],
  IMPACT: "Critique - Fraude paiement",
  RISK_LEVEL: "CRITICAL",

  // THREAT 4: SQL Injection
  THREAT: "SQL Injection via input utilisateur",
  SCENARIO: "POST /api/projects, title = \"'; DROP TABLE users; --\"",
  DEFENCE: [
    "✓ Supabase Client utilise parameterized queries (prepared statements)",
    "✓ Input validation + sanitization côté backend",
    "✓ TypeScript enforcing types (moins de runtime surprises)",
  ],
  IMPACT: "Critique - Accès DB complet",
  RISK_LEVEL: "CRITICAL",

  // THREAT 5: XSS (Cross-Site Scripting)
  THREAT: "XSS Attack",
  SCENARIO: "Description du projet contient <script>alert('xss')</script>",
  DEFENCE: [
    "✓ React échappe par défaut les strings (safe)",
    "✓ Sanitizer côté backend pour stored XSS",
    "✓ Content Security Policy header",
  ],
  IMPACT: "Haute - Session hijacking, cookie theft",
  RISK_LEVEL: "HIGH",

  // THREAT 6: CSRF (Cross-Site Request Forgery)
  THREAT: "CSRF Attack",
  SCENARIO: "Attacker site envoie POST /api/orders depuis session victime",
  DEFENCE: [
    "✓ SameSite=Strict sur cookies",
    "✓ CORS restrictions (origin whitelisting)",
    "✓ POST/PUT/DELETE nécessitent JSON (navigateur bloque auto)",
  ],
  IMPACT: "Moyenne - Commandes non-autorisées",
  RISK_LEVEL: "MEDIUM",

  // THREAT 7: Race condition paiement
  THREAT: "Double paiement (race condition)",
  SCENARIO: "Utilisateur clique 2x rapid → 2 commandes payées",
  DEFENCE: [
    "✓ UNIQUE constraint: (project_id, buyer_id) + status IN (pending, processing, completed)",
    "✓ Stripe idempotency key: même intent appelé 2x = même résultat",
    "✓ Webhook idempotency: même event_id → même UPDATE",
  ],
  IMPACT: "Moyenne - Double facturation",
  RISK_LEVEL: "MEDIUM",

  // THREAT 8: Data leakage
  THREAT: "Exposition de données sensibles",
  SCENARIO: "API expose stripe_account_id, passwords, etc.",
  DEFENCE: [
    "✓ SELECT ONLY public columns (SELECT id, title, price, ...)",
    "✓ JAMAIS SELECT * sauf en admin endpoints",
    "✓ Audit des réponses API (vérifier logs)",
  ],
  IMPACT: "Haute - PII, clés Stripe",
  RISK_LEVEL: "HIGH",

  // THREAT 9: API abuse / Rate limiting
  THREAT: "Brute force, DDoS",
  SCENARIO: "Attacker: 1000 login attempts / sec",
  DEFENCE: [
    "✓ Rate limiting per IP (future: via Vercel edge)",
    "✓ Supabase Auth: built-in rate limit sur auth endpoints",
    "✓ Monitoring & alertes",
  ],
  IMPACT: "Moyenne - Indisponibilité service",
  RISK_LEVEL: "MEDIUM",

  // THREAT 10: Unauthorized admin access
  THREAT: "Admin sans permission",
  SCENARIO: "Non-admin essaie d'approuver un projet (admin action)",
  DEFENCE: [
    "✓ Backend: if (!isAdmin()) throw 403",
    "✓ RLS: is_admin() check dans policies",
    "✓ Audit logs: chaque admin action loggée avec user_id",
  ],
  IMPACT: "Critique - Modération bypass",
  RISK_LEVEL: "CRITICAL",
};

/**
 * ============================================================================
 * PARTIE 7: CHECKLIST DE SÉCURITÉ AVANT PRODUCTION
 * ============================================================================
 */

const SECURITY_CHECKLIST = {
  AUTHENTICATION: [
    { task: "Supabase Auth configuré avec Email verification obligatoire", status: "TODO" },
    { task: "JWT token expiration: 1 heure", status: "TODO" },
    { task: "Refresh token: 7 jours", status: "TODO" },
    { task: "Cookies HTTP-Only activés", status: "TODO" },
    { task: "Cookies Secure flag activé (HTTPS seulement)", status: "TODO" },
    { task: "Cookies SameSite=Strict activé", status: "TODO" },
    { task: "Password requirements: 12+ chars, complexity", status: "TODO" },
    { task: "TOTP 2FA available (optional pour vendors)", status: "TODO" },
  ],

  DATABASE_SECURITY: [
    { task: "RLS activé sur TOUTES les tables", status: "TODO" },
    { task: "Vérifier qu'aucune table n'a SELECT * sans policy", status: "TODO" },
    { task: "Tester policies avec role=buyer, vendor, admin", status: "TODO" },
    { task: "Audit logs table populate tous les changements critiques", status: "TODO" },
    { task: "Database backups: daily + 30 jours rétention", status: "TODO" },
    { task: "Connection pooling configuré (Supabase)", status: "TODO" },
    { task: "Sensitive columns: stripe_account_id, passwords not selected", status: "TODO" },
  ],

  API_SECURITY: [
    { task: "Auth middleware appliqué à /api/dashboard/* routes", status: "TODO" },
    { task: "Auth middleware appliqué à /api/orders/* routes", status: "TODO" },
    { task: "Admin middleware appliqué à /api/admin/* routes", status: "TODO" },
    { task: "Rate limiting: 100 req/min per IP", status: "TODO" },
    { task: "CORS restrictions: origin whitelist", status: "TODO" },
    { task: "Content-Security-Policy headers", status: "TODO" },
    { task: "Input validation sur TOUTES les routes", status: "TODO" },
    { task: "Zod/validation schemas pour input", status: "TODO" },
    { task: "Error messages: NO stack traces exposés", status: "TODO" },
  ],

  PAYMENT_SECURITY: [
    { task: "Stripe webhook signature validation (CRITICAL)", status: "TODO" },
    { task: "Stripe webhook idempotency: handleEvent() safe", status: "TODO" },
    { task: "Payment intent: never expose client_secret en response", status: "TODO" },
    { task: "PCI compliance: Stripe Checkout seulement (no card storage)", status: "TODO" },
    { task: "Order amount = hardcoded from DB, pas trusted client", status: "TODO" },
    { task: "Webhook retry logic: max 5 retries", status: "TODO" },
  ],

  FILE_STORAGE: [
    { task: "Supabase Storage bucket: PRIVATE", status: "TODO" },
    { task: "Signed URLs: 5 min expiration", status: "TODO" },
    { task: "File path: UUID-based (non-sequential)", status: "TODO" },
    { task: "File size limit: 100MB/file", status: "TODO" },
    { task: "Allowed file types whitelist: .zip, .pdf, .md, etc", status: "TODO" },
    { task: "Antivirus scan on upload (future)", status: "TODO" },
    { task: "Virus definition updates: daily", status: "TODO" },
  ],

  FRONTEND_SECURITY: [
    { task: "React sanitization: dangerouslySetInnerHTML AVOIDED", status: "TODO" },
    { task: "DOMPurify ou equivalent pour rich text", status: "TODO" },
    { task: "No secrets in .env.local (use .env.local.example)", status: "TODO" },
    { task: ".gitignore: .env.local, .env.production.local, etc", status: "TODO" },
    { task: "No sensitive logs in console.log", status: "TODO" },
    { task: "Helmet.js configuré (Next.js security headers)", status: "TODO" },
  ],

  MONITORING_LOGGING: [
    { task: "Audit logs: tous les writes sur tables sensibles", status: "TODO" },
    { task: "Stripe events logging: tous les webhooks logés", status: "TODO" },
    { task: "Auth events logging: login, signup, logout, failed attempts", status: "TODO" },
    { task: "Alert sur: multiple failed logins, admin actions, etc", status: "TODO" },
    { task: "Log retention: 90 jours minimum", status: "TODO" },
    { task: "Sentry ou Datadog intégré pour errors", status: "TODO" },
  ],

  DEPLOYMENT: [
    { task: "Environment variables: JAMAIS hardcodées", status: "TODO" },
    { task: "Vercel Environment Secrets configurés", status: "TODO" },
    { task: "HTTPS enforced (automatic avec Vercel)", status: "TODO" },
    { task: "HSTS header: max-age=31536000", status: "TODO" },
    { task: "Staging environment pour tester avant prod", status: "TODO" },
    { task: "Database backups avant deploys", status: "TODO" },
    { task: "Rollback procedure documentée", status: "TODO" },
  ],

  THIRD_PARTY_SECURITY: [
    { task: "Stripe account 2FA enabled", status: "TODO" },
    { task: "Stripe API keys: restricted permissions", status: "TODO" },
    { task: "Supabase project: strong password + 2FA", status: "TODO" },
    { task: "Vercel deployment protection: team access only", status: "TODO" },
    { task: "DNS DNSSEC enabled", status: "TODO" },
  ],

  LEGAL_COMPLIANCE: [
    { task: "GDPR: privacy policy published", status: "TODO" },
    { task: "GDPR: user data export/deletion implementé", status: "TODO" },
    { task: "ToS: payment, refunds, intellectual property", status: "TODO" },
    { task: "PCI DSS compliance: Stripe only (no card storage)", status: "TODO" },
  ],

  INCIDENT_RESPONSE: [
    { task: "Incident response plan documented", status: "TODO" },
    { task: "Contact person nominated", status: "TODO" },
    { task: "Backup restoration tested (monthly)", status: "TODO" },
  ],
};

/**
 * ============================================================================
 * PARTIE 8: COMMANDES SQL POUR TESTER LES POLICIES
 * ============================================================================
 */

/*
 * TESTER EN TANT QUE BUYER:
 * 
 * SET SESSION AUTHORIZATION 'buyer_user_id';
 * SELECT * FROM projects; -- Doit retourner SEULEMENT published
 * SELECT * FROM orders; -- Doit retourner SEULEMENT ses orders (buyer_id = auth.uid())
 * SELECT * FROM deliverables; -- 403 si pas achat
 * 
 * TESTER EN TANT QUE VENDOR:
 * 
 * SET SESSION AUTHORIZATION 'vendor_user_id';
 * SELECT * FROM projects; -- Ses projets + published (sauf rejetés)
 * INSERT INTO projects (...) VALUES (...); -- OK si seller_id = auth.uid()
 * 
 * TESTER EN TANT QUE ADMIN:
 * 
 * SET SESSION AUTHORIZATION 'admin_user_id';
 * SELECT * FROM projects; -- TOUS les projets
 * SELECT * FROM audit_logs; -- Accès aux logs
 */

/**
 * ============================================================================
 * PARTIE 9: PROCESSUS DE REVUE DE SÉCURITÉ
 * ============================================================================
 */

const SECURITY_REVIEW_PROCESS = [
  "1. Code review: nouveau code par au moins 2 devs",
  "2. Vérifier: aucune donnée sensible exposée",
  "3. Vérifier: RLS policies appliquées",
  "4. Vérifier: input validation + error handling",
  "5. Security audit: trimestriel minimum",
  "6. Pen testing: avant chaque major release",
  "7. Dependency updates: mensuel (npm audit)",
  "8. OWASP Top 10 review: annuel",
];

export default SECURITY_CHECKLIST;
