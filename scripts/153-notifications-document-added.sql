-- Add document_added and file_added notification types
-- Run: npm run db:run -- scripts/153-notifications-document-added.sql

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'appointment'::text,
    'appointment_cancelled'::text,
    'appointment_rescheduled'::text,
    'prescription'::text,
    'new_prescription'::text,
    'prescription_sent'::text,
    'payment'::text,
    'review'::text,
    'system'::text,
    'reminder'::text,
    'message'::text,
    'chat'::text,
    'new_lab_request'::text,
    'lab_request_created'::text,
    'lab_results_ready'::text,
    'lab_request_denied'::text,
    'alert'::text,
    'document_added'::text,
    'file_added'::text
  ]));
