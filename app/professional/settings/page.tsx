import { redirect } from 'next/navigation'

/** Redirect legacy /professional/settings to unified dashboard settings */
export default function ProfessionalSettingsRedirect() {
  redirect('/professional/dashboard/settings')
}
