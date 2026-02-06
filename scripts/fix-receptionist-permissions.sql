-- ============================================================================
-- Fix Receptionist and default role permissions
-- Run in Supabase SQL Editor to correct existing roles
-- ============================================================================
-- Receptionist was missing lab_requests: true and samples: true for labs,
-- and permissions were not being enforced in the UI.
-- ============================================================================

UPDATE employee_roles
SET
  description = 'Front desk - appointments, test requests, sample receive; no settings',
  permissions = '{
    "dashboard": {
      "overview": true,
      "patients": true,
      "appointments": true,
      "messages": true,
      "finances": false,
      "analytics": false,
      "settings": false,
      "requests": true,
      "samples": true,
      "results": false,
      "equipment": false,
      "prescriptions": true,
      "orders": true,
      "inventory": false,
      "delivery": false,
      "documents": false,
      "lab_requests": true
    },
    "actions": {
      "create_appointments": true,
      "cancel_appointments": true,
      "view_patient_details": true,
      "create_prescriptions": false,
      "process_orders": false,
      "manage_inventory": false,
      "view_reports": false,
      "manage_employees": false,
      "manage_settings": false
    },
    "data": {
      "view_all_patients": true,
      "view_financial_data": false,
      "export_data": false
    }
  }'::jsonb,
  updated_at = now()
WHERE name = 'Receptionist';
