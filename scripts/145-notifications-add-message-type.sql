-- Add 'message' to notifications.type check constraint
-- Fixes: "notifications_type_check" when chat push notification trigger inserts type 'message'
-- Run: npm run db:run -- scripts/145-notifications-add-message-type.sql

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'appointment'::text,
    'prescription'::text,
    'payment'::text,
    'review'::text,
    'system'::text,
    'new_lab_request'::text,
    'lab_request_created'::text,
    'message'::text
  ]));

COMMENT ON CONSTRAINT notifications_type_check ON public.notifications IS
  'Allowed notification types; includes message for chat push notifications.';
