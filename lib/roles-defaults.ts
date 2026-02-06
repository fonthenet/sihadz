/**
 * Default system roles and permissions for professional employees.
 * Used when bootstrapping roles for a new professional.
 * Section visibility is filtered per business type in each dashboard (pharmacy, lab, doctor, clinic).
 */

export type DashboardPerms = {
  overview: boolean
  patients: boolean
  appointments: boolean
  messages: boolean
  finances: boolean
  analytics: boolean
  settings: boolean
  requests: boolean
  samples: boolean
  results: boolean
  equipment: boolean
  prescriptions: boolean
  orders: boolean
  inventory: boolean
  delivery: boolean
  documents: boolean
  lab_requests: boolean
  pos: boolean
  chifa: boolean
}

export type ActionsPerms = {
  create_appointments: boolean
  cancel_appointments: boolean
  view_patient_details: boolean
  create_prescriptions: boolean
  process_orders: boolean
  manage_inventory: boolean
  view_reports: boolean
  manage_employees: boolean
  manage_settings: boolean
}

export type DataPerms = {
  view_all_patients: boolean
  view_financial_data: boolean
  export_data: boolean
}

export type RolePermissions = {
  dashboard: DashboardPerms
  actions: ActionsPerms
  data: DataPerms
}

export interface DefaultRole {
  name: string
  description: string
  is_system: boolean
  permissions: RolePermissions
}

const fullDashboard: DashboardPerms = {
  overview: true, patients: true, appointments: true, messages: true,
  finances: true, analytics: true, settings: true, requests: true,
  samples: true, results: true, equipment: true, prescriptions: true,
  orders: true, inventory: true, delivery: true, documents: true,
  lab_requests: true, pos: true, chifa: true,
}
const fullActions: ActionsPerms = {
  create_appointments: true, cancel_appointments: true, view_patient_details: true,
  create_prescriptions: true, process_orders: true, manage_inventory: true,
  view_reports: true, manage_employees: true, manage_settings: true,
}
const fullData: DataPerms = { view_all_patients: true, view_financial_data: true, export_data: true }

const noData: DataPerms = { view_all_patients: false, view_financial_data: false, export_data: false }

export const DEFAULT_ROLES: DefaultRole[] = [
  {
    name: 'Admin',
    description: 'Full access to all features and settings',
    is_system: true,
    permissions: { dashboard: fullDashboard, actions: fullActions, data: fullData },
  },
  {
    name: 'Manager',
    description: 'Can manage operations but not settings or employees',
    is_system: true,
    permissions: {
      dashboard: { ...fullDashboard, settings: false },
      actions: { ...fullActions, manage_employees: false, manage_settings: false },
      data: fullData,
    },
  },
  {
    name: 'Receptionist',
    description: 'Front desk – appointments, test requests, sample receive; no settings',
    is_system: true,
    permissions: {
      dashboard: {
        overview: true, patients: true, appointments: true, messages: true,
        finances: false, analytics: false, settings: false, requests: true,
        samples: true, results: false, equipment: false, prescriptions: true,
        orders: true, inventory: false, delivery: false, documents: false,
        lab_requests: true, pos: false, chifa: false,
      },
      actions: {
        create_appointments: true, cancel_appointments: true, view_patient_details: true,
        create_prescriptions: false, process_orders: false, manage_inventory: false,
        view_reports: false, manage_employees: false, manage_settings: false,
      },
      data: { view_all_patients: true, view_financial_data: false, export_data: false },
    },
  },
  {
    name: 'Technician',
    description: 'Lab or pharmacy – process tests and orders; no settings or finances',
    is_system: true,
    permissions: {
      dashboard: {
        overview: true, patients: false, appointments: false, messages: true,
        finances: false, analytics: false, settings: false, requests: true,
        samples: true, results: true, equipment: true, prescriptions: true,
        orders: true, inventory: true, delivery: false, documents: false,
        lab_requests: true, pos: true, chifa: false,
      },
      actions: {
        create_appointments: false, cancel_appointments: false, view_patient_details: true,
        create_prescriptions: false, process_orders: true, manage_inventory: true,
        view_reports: false, manage_employees: false, manage_settings: false,
      },
      data: noData,
    },
  },
  {
    name: 'Assistant',
    description: 'View only – overview, requests, orders; minimal actions',
    is_system: true,
    permissions: {
      dashboard: {
        overview: true, patients: true, appointments: true, messages: false,
        finances: false, analytics: false, settings: false, requests: true,
        samples: false, results: false, equipment: false, prescriptions: false,
        orders: true, inventory: false, delivery: false, documents: false,
        lab_requests: true, pos: false, chifa: false,
      },
      actions: {
        create_appointments: false, cancel_appointments: false, view_patient_details: false,
        create_prescriptions: false, process_orders: false, manage_inventory: false,
        view_reports: false, manage_employees: false, manage_settings: false,
      },
      data: noData,
    },
  },
  // ——— Pharmacy-focused ———
  {
    name: 'Sales Person',
    description: 'Pharmacy sales – POS, prescriptions, orders, inventory; no Chifa or accounting',
    is_system: true,
    permissions: {
      dashboard: {
        overview: true, patients: false, appointments: false, messages: true,
        finances: false, analytics: false, settings: false, requests: false,
        samples: false, results: false, equipment: false, prescriptions: true,
        orders: true, inventory: true, delivery: false, documents: false,
        lab_requests: false, pos: true, chifa: false,
      },
      actions: {
        create_appointments: false, cancel_appointments: false, view_patient_details: true,
        create_prescriptions: false, process_orders: true, manage_inventory: true,
        view_reports: false, manage_employees: false, manage_settings: false,
      },
      data: noData,
    },
  },
  {
    name: 'Cashier',
    description: 'Pharmacy cashier – POS and orders only',
    is_system: true,
    permissions: {
      dashboard: {
        overview: true, patients: false, appointments: false, messages: false,
        finances: false, analytics: false, settings: false, requests: false,
        samples: false, results: false, equipment: false, prescriptions: true,
        orders: true, inventory: false, delivery: false, documents: false,
        lab_requests: false, pos: true, chifa: false,
      },
      actions: {
        create_appointments: false, cancel_appointments: false, view_patient_details: true,
        create_prescriptions: false, process_orders: true, manage_inventory: false,
        view_reports: false, manage_employees: false, manage_settings: false,
      },
      data: noData,
    },
  },
  // ——— Doctor / clinic ———
  {
    name: 'Physician',
    description: 'Doctor or clinic – patients, appointments, prescriptions, lab requests; no finances or settings',
    is_system: true,
    permissions: {
      dashboard: {
        overview: true, patients: true, appointments: true, messages: true,
        finances: false, analytics: false, settings: false, requests: false,
        samples: false, results: false, equipment: false, prescriptions: true,
        orders: false, inventory: false, delivery: false, documents: true,
        lab_requests: true, pos: false, chifa: false,
      },
      actions: {
        create_appointments: true, cancel_appointments: true, view_patient_details: true,
        create_prescriptions: true, process_orders: false, manage_inventory: false,
        view_reports: false, manage_employees: false, manage_settings: false,
      },
      data: { view_all_patients: true, view_financial_data: false, export_data: false },
    },
  },
  // ——— Lab-focused ———
  {
    name: 'Lab Technician',
    description: 'Laboratory – test requests, samples, results, equipment only',
    is_system: true,
    permissions: {
      dashboard: {
        overview: true, patients: false, appointments: false, messages: false,
        finances: false, analytics: false, settings: false, requests: true,
        samples: true, results: true, equipment: true, prescriptions: false,
        orders: false, inventory: false, delivery: false, documents: false,
        lab_requests: false, pos: false, chifa: false,
      },
      actions: {
        create_appointments: false, cancel_appointments: false, view_patient_details: true,
        create_prescriptions: false, process_orders: true, manage_inventory: false,
        view_reports: false, manage_employees: false, manage_settings: false,
      },
      data: noData,
    },
  },
]
