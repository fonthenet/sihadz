-- Allow lab request notification types in notifications.type check
-- Fixes: "new row for relation notifications violates check constraint notifications_type_check"
-- when API inserts type 'new_lab_request' or 'lab_request_created'

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'appointment'::text,
    'prescription'::text,
    'payment'::text,
    'review'::text,
    'system'::text,
    'new_lab_request'::text,
    'lab_request_created'::text
  ]));

COMMENT ON CONSTRAINT notifications_type_check ON public.notifications IS
  'Allowed notification types; includes new_lab_request and lab_request_created for lab workflow.';
