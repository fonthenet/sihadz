import PatientDashboard from './dashboard-content'

export default async function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await props.searchParams
  return <PatientDashboard />
}
