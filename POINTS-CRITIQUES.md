# 🔥 SEEDBAY - POINTS CRITIQUES (À NE PAS OUBLIER)

## ⚠️ Checklist Sécurité ABSOLUE

### 1. Webhook Stripe
```
❌ JAMAIS faire confiance au client pour confirmer le paiement
❌ JAMAIS accept order.status = 'completed' sauf via webhook signé
❌ JAMAIS skip la validation de signature Stripe

✅ TOUJOURS:
   - stripe.webhooks.constructEvent(body, signature, secret)
   - Vérifier chargedAmount == expectedAmount
   - Idempotency: vérifier if (order.status == 'completed') return
   - Log l'action dans audit_logs
```

### 2. Fichiers & Accès
```
❌ JAMAIS stocker les files publiquement
❌ JAMAIS donner URL directe (même si long UUID)
❌ JAMAIS exposer stripe_account_id

✅ TOUJOURS:
   - Supabase Storage: PRIVATE bucket
   - Signed URLs: 5 min expiration max
   - RLS Policy: vérifier has_purchased_project()
   - Audit: log chaque download
```

### 3. Authentification
```
❌ JAMAIS stocker password en plaintext
❌ JAMAIS accepter JWT non-signé
❌ JAMAIS faire confiance à auth.uid() du client

✅ TOUJOURS:
   - Supabase Auth gère les passwords
   - Vérifier JWT signature = Supabase signe automatiquement
   - auth.uid() = injected par Supabase (non-modifiable)
   - Email verification pour paiements
```

### 4. RLS Policies
```
❌ JAMAIS skipper une RLS policy
❌ JAMAIS utiliser SELECT * sauf admin
❌ JAMAIS faire confiance au client pour filtrer

✅ TOUJOURS:
   - RLS applique TOUTES les policies automatiquement
   - PostgreSQL bloque = 0 rows retournées
   - Impossible à contourner depuis client
   - Admin: peut tout voir, mais actions loggées
```

### 5. Données Sensibles
```
❌ JAMAIS exposer en response API:
   - stripe_account_id
   - passwords / password_hashes
   - JWT secrets
   - Database credentials
   - API keys

✅ À la place:
   - SELECT id, username, email, avg_rating (jamais stripe_account_id)
   - Vérifier CHAQUE response API
   - Tester: GET /api/users/[id] → pas de sensible data
```

---

## 🎯 Ordre de Priorité: Implémentation

### Priority 1: AUTHENTICATION (Jour 1)
1. [ ] Supabase Auth setup
2. [ ] seedbay-auth-lib.ts
3. [ ] seedbay-signup-route.ts
4. [ ] Email verification
5. Test avec: 6 authentication test cases

### Priority 2: DATABASE & RLS (Jour 2)
1. [ ] Exécuter seedbay-security.sql
2. [ ] Vérifier RLS activé sur TOUTES les tables
3. [ ] Tester les 7 authorization test cases
   - Buyer voir projects publiés
   - Vendor voir ses projects seulement
   - Admin voir tous les projects
4. [ ] Vérifier que RLS bloque l'accès unauthorized

### Priority 3: ORDERS & PAYMENT (Jour 3-4)
1. [ ] seedbay-create-order-route.ts
2. [ ] Stripe account setup
3. [ ] seedbay-webhook-route.ts
4. [ ] Test avec les 10 payment test cases
5. [ ] Webhook signature validation = CRITICAL

### Priority 4: FILES & STORAGE (Jour 4)
1. [ ] Supabase Storage setup (PRIVATE)
2. [ ] Signed URLs implementation
3. [ ] Test avec 8 file access test cases
4. [ ] Vérifier RLS bloque fichiers non-achetés

### Priority 5: VALIDATION & ERROR HANDLING (Jour 5)
1. [ ] Zod schemas sur TOUS les endpoints
2. [ ] Test avec 5 validation test cases
3. [ ] Error messages (JAMAIS exposer stack traces)

### Priority 6: AUDIT & MONITORING (Jour 6)
1. [ ] Audit logs table (seedbay-security.sql)
2. [ ] Log audit sur TOUS les writes
3. [ ] Test avec 6 audit logging test cases
4. [ ] Sentry integration

### Priority 7: TESTING COMPLET (Jour 7)
1. [ ] Exécuter TOUS les 56 test cases
2. [ ] Load testing (100 concurrent users)
3. [ ] Penetration testing simulation
4. [ ] Security audit final

### Priority 8: DEPLOYMENT (Jour 8)
1. [ ] Suivre seedbay-deployment-guide.ts EXACTEMENT
2. [ ] Staging deployment
3. [ ] Production deployment
4. [ ] Monitoring setup

---

## 🔐 Flux Sécurisé: Paiement (Copy-paste reference)

```typescript
// POST /api/orders/create-intent

export async function POST(request: NextRequest) {
  // 1. AUTHENTIFICATION
  const authResult = await requireAuth(request)
  if (authResult.error) return error(authResult)
  const userId = authResult.auth.sub
  
  // 2. EMAIL VÉRIFIÉ
  const emailResult = await requireEmailVerified(request)
  if (emailResult.error) return error(emailResult)
  
  // 3. VALIDER INPUT
  const { project_id } = CreateOrderSchema.parse(body)
  
  // 4. RÉCUPÉRER PROJET (RLS applique automatiquement)
  const { data: project } = await supabase
    .from("projects")
    .select("id, seller_id, price, title")
    .eq("id", project_id)
    .eq("status", "published") // ✓ Vérifier publié
    .single()
  
  if (!project) return 404
  
  // 5. VÉRIFIER PAS D'ACHAT PRÉCÉDENT
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("project_id", project_id)
    .eq("buyer_id", userId)
    .in("status", ["pending", "processing", "completed"])
    .single()
  
  if (existing) return 400 // Already purchased
  
  // 6. VÉRIFIER ACHETEUR != VENDEUR
  if (project.seller_id === userId) return 400
  
  // 7. CALCULER FRAIS CÔTÉ SERVEUR (JAMAIS CLIENT)
  const amountGross = Math.round(project.price * 100) // cents
  const platformFee = Math.round(amountGross * 0.15)
  const sellerPayout = amountGross - platformFee
  
  // 8. CRÉER ORDER
  const { data: order } = await supabase
    .from("orders")
    .insert({
      project_id,
      buyer_id: userId,
      seller_id: project.seller_id,
      amount_gross: project.price,
      platform_fee: project.price * 0.15,
      seller_payout: project.price * 0.85,
      stripe_payment_intent_id: "temp",
      status: "pending"
    })
    .select("id")
    .single()
  
  // 9. CRÉER STRIPE INTENT
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountGross,
    currency: "USD",
    description: `SeedBay: ${project.title}`,
    metadata: {
      order_id: order.id,
      project_id: project_id,
      seller_id: project.seller_id,
      buyer_id: userId
    },
    idempotency_key: `order-${order.id}`
  })
  
  // 10. METTRE À JOUR ORDER
  await supabase
    .from("orders")
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq("id", order.id)
  
  // 11. LOG AUDIT
  await logAudit(userId, "create_order", "orders", order.id, null, {
    project_id,
    amount: project.price,
    payment_intent: paymentIntent.id
  })
  
  // 12. RÉPONDRE (JAMAIS exposer full paymentIntent)
  return NextResponse.json({
    order_id: order.id,
    project_id: project_id,
    amount: project.price,
    currency: "USD",
    client_secret: paymentIntent.client_secret // ✓ Seulement ça
  })
}
```

---

## 🚦 Green Flags vs Red Flags

### ✅ GREEN FLAGS (Good Security)
- RLS activé sur toutes les tables
- JWT signé par Supabase
- Webhook signature validation
- Audit logs sur tous les writes
- SELECT seulement colonnes nécessaires
- Prix depuis DB, jamais client
- Email verification obligatoire
- Signed URLs 5 min expiration
- Error messages sans stack traces
- .env.local dans .gitignore

### 🚩 RED FLAGS (Danger)
- ❌ SELECT * dans les APIs
- ❌ RLS policy manquante
- ❌ Webhook sauté/non-validé
- ❌ Stripe key exposée en frontend
- ❌ Password stocké en plaintext
- ❌ Direct DB access depuis client
- ❌ JWT modifié côté client
- ❌ Fichiers en storage public
- ❌ Prix modifié par client
- ❌ Admin actions sans log

---

## 📱 Testing Checklist: Avant Deployment

```
AUTHENTICATION:
[ ] Signup + email verification fonctionne
[ ] Login/logout fonctionne
[ ] JWT expiration fonctionne
[ ] Modification JWT → 401

AUTHORIZATION:
[ ] Buyer voir seulement projets publiés
[ ] Vendor voir ses projets seulement
[ ] Admin voir tous les projets
[ ] IDOR check: GET /api/orders/[other-user] → 403

PAYMENT:
[ ] Créer ordre → PaymentIntent créé
[ ] Webhook reçu → order.status = completed
[ ] Fichiers inaccessibles sans achat
[ ] Signed URLs fonctionnent

RLS:
[ ] Test avec 3 users: buyer, vendor, admin
[ ] Chaque user ne voit QUE ses données
[ ] RLS bloque sans error (0 rows)

INJECTION:
[ ] SQL injection test → rejeté ou échappé
[ ] XSS test → rejeté ou échappé
[ ] Rate limiting teste

AUDIT:
[ ] Chaque action loggée dans audit_logs
[ ] Admin voir les logs
[ ] Logs ne peuvent pas être supprimés
```

---

## 📞 Si Vous Êtes Bloqué

### Webhook Stripe pas reçu?
```
1. Vérifier STRIPE_WEBHOOK_SECRET dans .env
2. Vérifier endpoint dans Stripe dashboard = /api/payments/webhook
3. Test: stripe trigger payment_intent.succeeded
4. Logs: check Stripe webhook history
```

### RLS policy ne bloque pas?
```
1. Vérifier RLS activé: ALTER TABLE ... ENABLE ROW LEVEL SECURITY
2. Vérifier policy existe: SELECT * FROM pg_policies WHERE schemaname = 'public'
3. Tester avec role: SET SESSION AUTHORIZATION 'user_id'
4. Debug: SELECT * FROM projects (doit retourner 0 rows si pas autorisé)
```

### Stripe key leak?
```
Immediate actions:
1. Revoke la key dans Stripe dashboard
2. Créer une nouvelle key
3. Mettre à jour .env
4. Redeploy
```

### Email verification ne fonctionne pas?
```
1. Vérifier Supabase Auth provider configuré (SendGrid, Resend, etc)
2. Vérifier SMTP credentials
3. Checker spam folder
4. Vérifier URL de redirection dans Supabase settings
```

---

## 🎉 Quand Vous Êtes Prêt

### Checklist finale avant "Go Live":
```
[ ] 56/56 tests passed
[ ] Pas de error dans Sentry
[ ] Performance: < 200ms p99
[ ] Uptime: 100% pendant 24 heures
[ ] Paiements: 10+ transactions réussies
[ ] RLS: 100% pas d'unauthorized accès
[ ] Audit: tous les logs présents
[ ] Monitoring: alertes configurées
[ ] Documentation: complète & testée
```

### Félicitations! 🚀
Vous pouvez lancer!

---

*Version: 1.0*
*Last Updated: 28 janvier 2026*
*Status: PRODUCTION READY*
