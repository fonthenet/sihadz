-- Add supplier_order, supplier_invoice, and prescription status types to notifications
-- Fixes: order updates not appearing in notification center for pros and patients
-- Run: npm run db:run -- scripts/203-notifications-order-types.sql

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'appointment'::text,
    'appointment_cancelled'::text,
    'appointment_rescheduled'::text,
    'prescription'::text,
    'new_prescription'::text,
    'prescription_sent'::text,
    'prescription_ready'::text,
    'prescription_collected'::text,
    'prescription_dispensed'::text,
    'prescription_partial'::text,
    'prescription_unavailable'::text,
    'prescription_declined'::text,
    'prescription_fulfilled'::text,
    'payment'::text,
    'review'::text,
    'system'::text,
    'reminder'::text,
    'message'::text,
    'chat'::text,
    'new_lab_request'::text,
    'lab_request'::text,
    'lab_request_created'::text,
    'lab_results_ready'::text,
    'lab_request_denied'::text,
    'alert'::text,
    'document_added'::text,
    'file_added'::text,
    'supplier_order'::text,
    'supplier_invoice'::text
  ]));

COMMENT ON CONSTRAINT notifications_type_check ON public.notifications IS
  'All notification types including supplier orders, invoices, prescription statuses';
