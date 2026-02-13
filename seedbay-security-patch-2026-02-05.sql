-- ============================================================================
-- SEEDBAY: SECURITY + PAYMENTS PATCH (2026-02-05) - HARDENED
-- Objectif: orders/purchases source de vérité + webhook idempotent + RLS
-- ============================================================================

-- 0) EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) ENUMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
  END IF;
END
$$;

-- 2) ORDERS TABLE (alignement schéma + contraintes + indexes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    RAISE EXCEPTION 'Table public.orders manquante';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'buyer_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.orders RENAME COLUMN buyer_id TO user_id';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'amount_gross'
  ) THEN
    EXECUTE 'ALTER TABLE public.orders RENAME COLUMN amount_gross TO amount';
  END IF;
END
$$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS project_id UUID,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;

-- Backfill legacy status values
UPDATE public.orders
SET status = CASE
  WHEN status IN ('completed') THEN 'paid'
  WHEN status IN ('processing') THEN 'pending'
  WHEN status IN ('pending', 'paid', 'failed', 'refunded') THEN status
  ELSE 'pending'
END
WHERE status IS NOT NULL;

-- Guardrails avant NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'orders.user_id contient des NULLs';
  END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE project_id IS NULL) THEN
    RAISE EXCEPTION 'orders.project_id contient des NULLs';
  END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE stripe_payment_intent_id IS NULL) THEN
    RAISE EXCEPTION 'orders.stripe_payment_intent_id contient des NULLs';
  END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE amount IS NULL) THEN
    RAISE EXCEPTION 'orders.amount contient des NULLs';
  END IF;
END
$$;

-- IMPORTANT: retirer DEFAULT texte avant cast
ALTER TABLE public.orders
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.orders
  ALTER COLUMN status TYPE public.order_status USING status::public.order_status;

ALTER TABLE public.orders
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.orders
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN project_id SET NOT NULL,
  ALTER COLUMN stripe_payment_intent_id SET NOT NULL,
  ALTER COLUMN amount SET NOT NULL;

-- Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_user_id_fkey'
      AND table_schema = 'public'
  ) THEN
    EXECUTE 'ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_project_id_fkey'
      AND table_schema = 'public'
  ) THEN
    EXECUTE 'ALTER TABLE public.orders ADD CONSTRAINT orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE';
  END IF;
END
$$;

-- Constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_amount_positive'
      AND table_schema = 'public'
  ) THEN
    EXECUTE 'ALTER TABLE public.orders ADD CONSTRAINT orders_amount_positive CHECK (amount > 0)';
  END IF;
END
$$;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_payment_intent_id_idx
  ON public.orders (stripe_payment_intent_id);

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_charge_id_idx
  ON public.orders (stripe_charge_id)
  WHERE stripe_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_user_id_idx
  ON public.orders (user_id);

CREATE INDEX IF NOT EXISTS orders_project_id_idx
  ON public.orders (project_id);

CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
  ON public.orders (status, created_at DESC);

-- Un seul order actif par user/projet (pending + paid)
CREATE UNIQUE INDEX IF NOT EXISTS orders_unique_active_idx
  ON public.orders (user_id, project_id)
  WHERE status IN ('pending', 'paid');

-- 3) PURCHASES TABLE (source de vérité accès)
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS purchases_order_id_idx
  ON public.purchases (order_id);

CREATE INDEX IF NOT EXISTS purchases_user_id_idx
  ON public.purchases (user_id);

CREATE INDEX IF NOT EXISTS purchases_project_id_idx
  ON public.purchases (project_id);

-- 4) STRIPE EVENTS (idempotence webhook)
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS stripe_events_status_idx
  ON public.stripe_events (status, created_at DESC);

-- 5) INDEXES PERFORMANCE
CREATE INDEX IF NOT EXISTS projects_status_created_at_idx
  ON public.projects (status, created_at DESC);

CREATE INDEX IF NOT EXISTS projects_price_idx
  ON public.projects (price);

-- 6) BUSINESS RULES (triggers)
-- Empêcher achat propriétaire + projet non publié + montant incohérent
CREATE OR REPLACE FUNCTION public.assert_order_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
  v_seller_id UUID;
  v_price DECIMAL(10,2);
  v_currency TEXT;
BEGIN
  SELECT status, seller_id, price, currency
  INTO v_status, v_seller_id, v_price, v_currency
  FROM public.projects
  WHERE id = NEW.project_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Projet introuvable';
  END IF;

  IF v_status <> 'published' THEN
    RAISE EXCEPTION 'Projet non achetable (status=%)', v_status;
  END IF;

  IF v_seller_id = NEW.user_id THEN
    RAISE EXCEPTION 'Achat interdit: propriétaire';
  END IF;

  IF NEW.amount IS NULL THEN
    NEW.amount := v_price;
  END IF;

  IF NEW.amount <> v_price THEN
    RAISE EXCEPTION 'Montant incohérent: % vs %', NEW.amount, v_price;
  END IF;

  IF NEW.currency IS NULL THEN
    NEW.currency := v_currency;
  END IF;

  IF NEW.currency <> v_currency THEN
    RAISE EXCEPTION 'Devise incohérente: % vs %', NEW.currency, v_currency;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_validate_insert ON public.orders;
CREATE TRIGGER orders_validate_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.assert_order_insert();

-- Garantir que purchases correspond à un order paid
CREATE OR REPLACE FUNCTION public.assert_purchase_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_order_user UUID;
  v_order_project UUID;
  v_order_status public.order_status;
BEGIN
  SELECT user_id, project_id, status
  INTO v_order_user, v_order_project, v_order_status
  FROM public.orders
  WHERE id = NEW.order_id;

  IF v_order_user IS NULL THEN
    RAISE EXCEPTION 'Order introuvable';
  END IF;

  IF v_order_status <> 'paid' THEN
    RAISE EXCEPTION 'Order non payée';
  END IF;

  IF v_order_user <> NEW.user_id OR v_order_project <> NEW.project_id THEN
    RAISE EXCEPTION 'Mismatch order/user/project';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS purchases_validate_insert ON public.purchases;
CREATE TRIGGER purchases_validate_insert
  BEFORE INSERT ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.assert_purchase_insert();

-- 7) RLS UPDATES
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_see_own_orders" ON public.orders;
DROP POLICY IF EXISTS "buyer_create_order" ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin_only" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_admin_only" ON public.orders;
DROP POLICY IF EXISTS "admin_see_all_orders" ON public.orders;

-- Orders: user + vendeur (owner) + admin
CREATE POLICY "users_see_own_orders" ON public.orders
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY "admin_see_all_orders" ON public.orders
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "buyer_create_order" ON public.orders
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.email_verified()
    AND NOT EXISTS (
      SELECT 1 FROM public.purchases p
      WHERE p.project_id = project_id
        AND p.user_id = auth.uid()
    )
    AND status = 'pending'
  );

CREATE POLICY "orders_update_admin_only" ON public.orders
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "orders_delete_admin_only" ON public.orders
  FOR DELETE
  USING (public.is_admin());

-- Purchases: source de vérité accès
DROP POLICY IF EXISTS "users_see_own_purchases" ON public.purchases;
DROP POLICY IF EXISTS "purchases_no_insert" ON public.purchases;
DROP POLICY IF EXISTS "admin_see_all_purchases" ON public.purchases;
DROP POLICY IF EXISTS "purchases_admin_only" ON public.purchases;

CREATE POLICY "users_see_own_purchases" ON public.purchases
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY "admin_see_all_purchases" ON public.purchases
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "purchases_no_insert" ON public.purchases
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "purchases_no_update" ON public.purchases
  FOR UPDATE
  USING (false);

CREATE POLICY "purchases_no_delete" ON public.purchases
  FOR DELETE
  USING (false);

-- Stripe events: admin read only
DROP POLICY IF EXISTS "stripe_events_admin_read" ON public.stripe_events;
CREATE POLICY "stripe_events_admin_read" ON public.stripe_events
  FOR SELECT
  USING (public.is_admin());

-- Deliverables: schéma détecté = order_id (idempotent)
-- Renforcer FK vers orders si absente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'deliverables_order_id_fkey'
      AND table_schema = 'public'
  ) THEN
    EXECUTE 'ALTER TABLE public.deliverables ADD CONSTRAINT deliverables_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE';
  END IF;
END
$$;

DROP POLICY IF EXISTS "paid_buyer_see_deliverables" ON public.deliverables;
CREATE POLICY "paid_buyer_see_deliverables" ON public.deliverables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchases p
      JOIN public.orders o ON o.id = p.order_id
      JOIN public.projects pr ON pr.id = o.project_id
      WHERE p.order_id = deliverables.order_id
        AND p.user_id = auth.uid()
        AND pr.status <> 'archived'
    )
  );

-- Downloads: uniquement acheteurs via purchases
DROP POLICY IF EXISTS "users_see_own_downloads" ON public.downloads;
DROP POLICY IF EXISTS "log_downloads" ON public.downloads;

CREATE POLICY "users_see_own_downloads" ON public.downloads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchases p
      JOIN public.orders o ON o.id = p.order_id
      WHERE o.id = order_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "log_downloads" ON public.downloads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.purchases p
      WHERE p.order_id = order_id
        AND p.user_id = auth.uid()
    )
  );

-- 8) TRIGGER update purchase_count sur paiement
DROP TRIGGER IF EXISTS increment_purchase_on_order ON public.orders;

CREATE OR REPLACE FUNCTION public.increment_purchase_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE public.projects
    SET purchase_count = purchase_count + 1
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_purchase_on_order AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.increment_purchase_count();
