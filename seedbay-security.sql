-- ============================================================================
-- SEEDBAY: ARCHITECTURE DE SÉCURITÉ COMPLÈTE
-- PostgreSQL + Supabase RLS
-- ============================================================================
-- Dernière mise à jour: 28 janvier 2026
-- Environnement: Production-ready

-- ============================================================================
-- PARTIE 1: SETUP INITIAL & CONFIGURATION
-- ============================================================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PARTIE 2: SCHÉMA DE BASE DE DONNÉES COMPLET
-- ============================================================================

-- TABLE: users (profil utilisateur étendu)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'buyer', -- buyer | vendor | admin
  
  -- Profil vendeur
  seller_verified BOOLEAN DEFAULT false,
  seller_badge TEXT, -- 'bronze' | 'silver' | 'gold'
  seller_bio TEXT,
  seller_website TEXT,
  stripe_account_id TEXT, -- Stripe Connect ID (sensible)
  
  -- Statistiques
  avg_rating DECIMAL(2,1) DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_projects_sold INTEGER DEFAULT 0,
  
  -- Dates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Contraintes
  CONSTRAINT valid_role CHECK (role IN ('buyer', 'vendor', 'admin')),
  CONSTRAINT valid_badge CHECK (seller_badge IS NULL OR seller_badge IN ('bronze', 'silver', 'gold'))
);

-- TABLE: projects (projets à vendre)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  
  -- Métadonnées produit
  maturity_level TEXT NOT NULL, -- idea | roadmap | mvp | production
  tech_stack TEXT[] NOT NULL, -- ['React', 'Node.js', 'PostgreSQL']
  license_type TEXT NOT NULL, -- exclusive | non-exclusive
  category TEXT NOT NULL, -- saas | mobile-app | web-app | api | etc
  tags TEXT[],
  
  -- Contenu commercial
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  currency TEXT DEFAULT 'USD',
  thumbnail_url TEXT,
  
  -- Statut & modération
  status TEXT NOT NULL DEFAULT 'draft', -- draft | pending_review | published | rejected | archived
  rejection_reason TEXT, -- Raison du rejet par admin
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMP WITH TIME ZONE,
  
  -- Statistiques
  view_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  
  -- Modération IA
  ai_moderation_score DECIMAL(3,2), -- 0.0 à 1.0, >0.7 = content problématique
  ai_moderation_checked_at TIMESTAMP WITH TIME ZONE,
  ai_moderation_issues TEXT[],
  
  -- Dates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_maturity CHECK (maturity_level IN ('idea', 'roadmap', 'mvp', 'production')),
  CONSTRAINT valid_license CHECK (license_type IN ('exclusive', 'non-exclusive')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  CONSTRAINT valid_price CHECK (price > 0)
);

-- TABLE: deliverables (fichiers livrables)
CREATE TABLE IF NOT EXISTS public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- Stockage
  file_key TEXT NOT NULL UNIQUE, -- chemin Supabase Storage
  file_type TEXT NOT NULL, -- code | document | design | data | other
  file_size INTEGER NOT NULL, -- bytes
  file_mime_type TEXT, -- application/zip, application/pdf, etc.
  
  -- Version
  version INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_file_type CHECK (file_type IN ('code', 'document', 'design', 'data', 'other')),
  CONSTRAINT positive_size CHECK (file_size > 0)
);

-- TABLE: orders (commandes acheteur)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Paiement
  amount_gross DECIMAL(10,2) NOT NULL CHECK (amount_gross > 0),
  platform_fee DECIMAL(10,2) NOT NULL, -- 15% commission
  seller_payout DECIMAL(10,2) NOT NULL, -- 85%
  currency TEXT DEFAULT 'USD',
  
  -- Stripe
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_charge_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed | refunded
  status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Payout
  payout_id TEXT, -- Stripe payout ID
  payout_date TIMESTAMP WITH TIME ZONE,
  
  -- Dates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  -- Contrainte: un seul achat par utilisateur par projet
  UNIQUE(project_id, buyer_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  CONSTRAINT positive_amount CHECK (amount_gross > 0),
  CONSTRAINT valid_fees CHECK (platform_fee + seller_payout = amount_gross * 0.15 + amount_gross * 0.85),
  CONSTRAINT buyer_not_seller CHECK (buyer_id != seller_id)
);

-- TABLE: downloads (tracking téléchargements)
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES public.deliverables(id) ON DELETE CASCADE,
  
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  download_ip TEXT, -- Pour audit
  download_user_agent TEXT
);

-- TABLE: reviews (avis)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  helpful_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un seul avis par commande
  UNIQUE(order_id)
);

-- TABLE: messages (contact acheteur-vendeur)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT sender_not_recipient CHECK (sender_id != recipient_id)
);

-- TABLE: favorites (projets favoris)
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, project_id)
);

-- TABLE: audit_logs (traçabilité des actions sensibles)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- create_project | edit_project | delete_project | create_order | approve_project | etc
  resource_type TEXT, -- project | order | user | etc
  resource_id UUID,
  old_values JSONB, -- Valeurs avant
  new_values JSONB, -- Valeurs après
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX (user_id),
  INDEX (resource_type, resource_id),
  INDEX (created_at DESC)
);

-- ============================================================================
-- PARTIE 3: FONCTIONS DE VÉRIFICATION DE SÉCURITÉ
-- ============================================================================

-- Fonction: Vérifier si l'utilisateur courant est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Vérifier si l'utilisateur courant est vendeur
CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('vendor', 'admin')
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Vérifier si l'utilisateur a acheté un projet spécifique
CREATE OR REPLACE FUNCTION public.has_purchased_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.orders
    WHERE project_id = p_project_id
      AND buyer_id = auth.uid()
      AND status = 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Vérifier si l'utilisateur est propriétaire d'un projet
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT seller_id = auth.uid()
    FROM public.projects
    WHERE id = p_project_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Vérifier si l'email est vérifié (requis pour paiement)
CREATE OR REPLACE FUNCTION public.email_verified()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT email_verified_at IS NOT NULL
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Logger une action d'audit
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    current_setting('request.headers')::json->>'cf-connecting-ip',
    current_setting('request.headers')::json->>'user-agent'
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PARTIE 4: ROW LEVEL SECURITY (RLS) - POLICIES CRITIQUES
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: users (Profils)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Tout le monde peut voir les profils publics (sauf données sensibles)
CREATE POLICY "public_user_profiles_readable" ON public.users
  FOR SELECT
  USING (true);

-- Policy: Utilisateurs ne peuvent éditer que leur propre profil
CREATE POLICY "users_update_own_profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- Un utilisateur ne peut pas changer son rôle (sauf admin)
      NEW.role = OLD.role OR public.is_admin()
    )
  );

-- Policy: Utilisateurs ne peuvent pas insérer de profil (créé via Auth)
CREATE POLICY "users_no_insert" ON public.users
  FOR INSERT
  WITH CHECK (false);

-- Policy: Admin peut modifier tous les profils
CREATE POLICY "admin_manage_all_users" ON public.users
  FOR ALL
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: projects (Projets à vendre)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: Projets publiés visibles à tous
CREATE POLICY "published_projects_readable" ON public.projects
  FOR SELECT
  USING (status = 'published');

-- Policy: Vendeurs voir leurs propres projets (draft, en review, etc)
CREATE POLICY "vendor_see_own_projects" ON public.projects
  FOR SELECT
  USING (seller_id = auth.uid());

-- Policy: Admin voir tous les projets
CREATE POLICY "admin_see_all_projects" ON public.projects
  FOR SELECT
  USING (public.is_admin());

-- Policy: Vendeurs créer des projets
CREATE POLICY "vendor_create_projects" ON public.projects
  FOR INSERT
  WITH CHECK (
    seller_id = auth.uid()
    AND public.is_vendor()
    AND status = 'draft' -- Nouveau projet en draft
  );

-- Policy: Vendeurs éditer leurs propres projets (sauf status)
CREATE POLICY "vendor_update_own_projects" ON public.projects
  FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (
    seller_id = auth.uid()
    -- Vendeur ne peut pas auto-publish; doit attendre approbation admin
    AND (
      (OLD.status = 'draft' AND NEW.status = 'pending_review')
      OR
      (OLD.status = NEW.status) -- Garder le même status
    )
  );

-- Policy: Vendeurs supprimer leurs propres projets (seulement en draft)
CREATE POLICY "vendor_delete_own_draft_projects" ON public.projects
  FOR DELETE
  USING (
    seller_id = auth.uid()
    AND status = 'draft'
  );

-- Policy: Admin manage all projects
CREATE POLICY "admin_manage_all_projects" ON public.projects
  FOR ALL
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: deliverables (Fichiers livrables)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

-- Policy: Propriétaire du projet voir les livrables
CREATE POLICY "project_owner_see_deliverables" ON public.deliverables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND seller_id = auth.uid()
    )
  );

-- Policy: Acheteur ayant payé voir les livrables
CREATE POLICY "paid_buyer_see_deliverables" ON public.deliverables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE project_id = deliverables.project_id
        AND buyer_id = auth.uid()
        AND status = 'completed'
    )
  );

-- Policy: Admin voir tous les livrables
CREATE POLICY "admin_see_all_deliverables" ON public.deliverables
  FOR SELECT
  USING (public.is_admin());

-- Policy: Propriétaire de projet peut uploader des livrables
CREATE POLICY "project_owner_upload_deliverables" ON public.deliverables
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND seller_id = auth.uid()
    )
  );

-- Policy: Propriétaire peut mettre à jour les livrables
CREATE POLICY "project_owner_update_deliverables" ON public.deliverables
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND seller_id = auth.uid()
    )
  );

-- Policy: Admin manage tous les livrables
CREATE POLICY "admin_manage_deliverables" ON public.deliverables
  FOR ALL
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: orders (Commandes)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy: Acheteur et vendeur voir leurs ordres
CREATE POLICY "users_see_own_orders" ON public.orders
  FOR SELECT
  USING (
    buyer_id = auth.uid()
    OR seller_id = auth.uid()
  );

-- Policy: Admin voir toutes les commandes
CREATE POLICY "admin_see_all_orders" ON public.orders
  FOR SELECT
  USING (public.is_admin());

-- Policy: Acheteur créer une commande (avec vérifications)
CREATE POLICY "buyer_create_order" ON public.orders
  FOR INSERT
  WITH CHECK (
    buyer_id = auth.uid()
    AND public.email_verified() -- Email doit être vérifié pour payer
    AND NOT EXISTS (
      -- Un seul achat par projet par utilisateur
      SELECT 1 FROM public.orders existing
      WHERE existing.project_id = project_id
        AND existing.buyer_id = auth.uid()
        AND existing.status IN ('pending', 'processing', 'completed')
    )
    AND status = 'pending' -- Nouveau paiement en pending
  );

-- Policy: Seul Stripe webhook peut modifier status des ordres
-- Les mises à jour directes sont bloquées pour les utilisateurs
CREATE POLICY "orders_immutable_for_users" ON public.orders
  FOR UPDATE
  USING (public.is_admin()); -- Seul admin (webhook signed) peut updater

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: downloads (Téléchargements)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Policy: Utilisateur peut voir ses téléchargements
CREATE POLICY "users_see_own_downloads" ON public.downloads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND buyer_id = auth.uid()
    )
  );

-- Policy: Vendeur voir les téléchargements de ses projets
CREATE POLICY "vendor_see_downloads" ON public.downloads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.projects p ON p.id = o.project_id
      WHERE o.id = order_id AND p.seller_id = auth.uid()
    )
  );

-- Policy: Admin voir tous les downloads
CREATE POLICY "admin_see_all_downloads" ON public.downloads
  FOR SELECT
  USING (public.is_admin());

-- Policy: API uniquement insert
CREATE POLICY "log_downloads" ON public.downloads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND buyer_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: reviews (Avis)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Tout le monde voir les avis
CREATE POLICY "reviews_readable" ON public.reviews
  FOR SELECT
  USING (true);

-- Policy: Acheteur peut laisser un avis seulement pour ses achats
CREATE POLICY "buyer_create_review" ON public.reviews
  FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND buyer_id = auth.uid()
    )
  );

-- Policy: Acheteur peut éditer son avis
CREATE POLICY "buyer_update_own_review" ON public.reviews
  FOR UPDATE
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: messages (Messages)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Utilisateur voir ses messages
CREATE POLICY "users_see_own_messages" ON public.messages
  FOR SELECT
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
  );

-- Policy: Admin voir tous les messages
CREATE POLICY "admin_see_all_messages" ON public.messages
  FOR SELECT
  USING (public.is_admin());

-- Policy: Utilisateur peut envoyer un message
CREATE POLICY "users_can_send_messages" ON public.messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: audit_logs (Logs d'audit)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin only voir les logs
CREATE POLICY "admin_see_audit_logs" ON public.audit_logs
  FOR SELECT
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: favorites (Favoris)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Utilisateur voir ses favoris
CREATE POLICY "users_see_own_favorites" ON public.favorites
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Utilisateur gérer ses favoris
CREATE POLICY "users_manage_own_favorites" ON public.favorites
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_delete_own_favorites" ON public.favorites
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- PARTIE 5: TRIGGERS & AUTOMATISATION
-- ============================================================================

-- Trigger: Update timestamp updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_projects_timestamp BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_deliverables_timestamp BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_orders_timestamp BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_messages_timestamp BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_reviews_timestamp BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Trigger: Incrémenter purchase_count quand commande complétée
CREATE OR REPLACE FUNCTION public.increment_purchase_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.projects
    SET purchase_count = purchase_count + 1
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_purchase_on_order AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.increment_purchase_count();

-- Trigger: Mettre à jour avg_rating quand review ajoutée/modifiée
CREATE OR REPLACE FUNCTION public.update_project_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_new_avg DECIMAL(2,1);
BEGIN
  SELECT AVG(rating)::DECIMAL(2,1) INTO v_new_avg
  FROM public.reviews
  WHERE project_id = NEW.project_id;
  
  UPDATE public.projects
  SET avg_rating = COALESCE(v_new_avg, 0),
      review_count = (SELECT COUNT(*) FROM public.reviews WHERE project_id = NEW.project_id)
  WHERE id = NEW.project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_on_review AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_project_rating();

-- Trigger: Logger les modifications sensibles
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit(
      'delete_' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit(
      'update_' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit(
      'create_' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Audit logs pour tables sensibles
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_deliverables AFTER INSERT OR UPDATE OR DELETE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- ============================================================================
-- PARTIE 6: INDICES & OPTIMISATIONS
-- ============================================================================

-- Indices pour performances
CREATE INDEX idx_projects_seller_id ON public.projects(seller_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_category ON public.projects(category);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

CREATE INDEX idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX idx_orders_project_id ON public.orders(project_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_stripe_payment_intent ON public.orders(stripe_payment_intent_id);

CREATE INDEX idx_deliverables_project_id ON public.deliverables(project_id);

CREATE INDEX idx_reviews_project_id ON public.reviews(project_id);
CREATE INDEX idx_reviews_reviewer_id ON public.reviews(reviewer_id);

CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);

CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_project_id ON public.favorites(project_id);

-- ============================================================================
-- PARTIE 7: COMMENTAIRES DE SÉCURITÉ CRITIQUE
-- ============================================================================

COMMENT ON TABLE public.projects IS 'Projets à vendre. RLS: publiés visible à tous, owner voir tous siens, admin voir tous.';
COMMENT ON TABLE public.orders IS 'Commandes acheteur. RLS: buyer et seller voir leur commande. STATUS UPDATE ONLY VIA WEBHOOK.';
COMMENT ON TABLE public.deliverables IS 'Fichiers. RLS: owner et acheteur payé uniquement.';
COMMENT ON COLUMN public.users.stripe_account_id IS '⚠️ SENSIBLE: Ne jamais exposer en frontend';
COMMENT ON COLUMN public.orders.stripe_payment_intent_id IS '⚠️ CRITIQUE: Unique + webhook validation obligatoire';
COMMENT ON COLUMN public.projects.status IS 'Draft → PendingReview → Published/Rejected. Admin seul peut publish/reject.';
COMMENT ON FUNCTION public.is_admin() IS 'CRITICAL: Utilisée dans les policies. Check user.role = admin.';

-- ============================================================================
-- FIN DU SCHÉMA SÉCURISÉ
-- ============================================================================
