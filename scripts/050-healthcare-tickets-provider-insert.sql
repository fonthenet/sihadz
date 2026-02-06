-- =====================================================
-- Allow primary providers (doctors) to INSERT healthcare_tickets
-- Fixes: "new row violates row-level security policy" when doctor
-- creates a prescription ticket via POST /api/tickets/prescription.
-- =====================================================

-- Drop if exists so we can re-run safely
DROP POLICY IF EXISTS "tickets_provider_insert" ON public.healthcare_tickets;

-- Primary provider (e.g. doctor) can create tickets where they are primary_provider_id
CREATE POLICY "tickets_provider_insert" ON public.healthcare_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    primary_provider_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  );
