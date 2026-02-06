// Healthcare Ecosystem Components
// Export all healthcare-related components for easy importing

export { TicketCard } from './ticket-card'
export { TicketDetailView } from './ticket-detail-view'

// Re-export types from ticket service
export type {
  HealthcareTicket,
  TicketType,
  TicketStatus,
  TicketParticipant,
  TicketMessage,
  TicketTimelineEntry,
  ParticipantRole,
} from '@/lib/services/ticket-service'

export {
  ticketService,
  STATUS_LABELS,
  TICKET_STATUS_FLOWS,
} from '@/lib/services/ticket-service'
