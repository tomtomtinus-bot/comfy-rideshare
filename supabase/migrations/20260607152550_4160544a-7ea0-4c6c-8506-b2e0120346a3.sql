
-- 1. Profiles deletion columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;

-- 2. Platform invoice failure tracking
ALTER TABLE public.platform_invoices
  ADD COLUMN IF NOT EXISTS last_charge_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_charge_error text;

-- 3. Helper: active sub for escort or via company
CREATE OR REPLACE FUNCTION public.has_escort_active_subscription(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- own sub (sandbox or live)
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _user
        AND (
          (s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end > now()))
          OR (s.status = 'canceled' AND s.current_period_end > now())
        )
    )
    OR
    -- via active company membership
    EXISTS (
      SELECT 1
      FROM public.company_members cm
      JOIN public.companies c ON c.id = cm.company_id
      JOIN public.subscriptions s ON s.user_id = c.owner_id
      WHERE cm.user_id = _user
        AND cm.status = 'active'
        AND (
          (s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end > now()))
          OR (s.status = 'canceled' AND s.current_period_end > now())
        )
    );
$$;

-- 4. Enforce subscription before accepting an assignment
CREATE OR REPLACE FUNCTION public.enforce_escort_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Only enforce when escort transitions into 'accepted'
  IF NEW.status = 'accepted'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted') THEN
    IF NOT public.has_escort_active_subscription(NEW.escort_id) THEN
      RAISE EXCEPTION 'Geen actief abonnement. Activeer je abonnement om opdrachten te accepteren.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_escort_subscription ON public.ride_assignments;
CREATE TRIGGER trg_enforce_escort_subscription
  BEFORE INSERT OR UPDATE OF status ON public.ride_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_escort_subscription();
