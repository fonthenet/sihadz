import DoctorAppointmentDetailsClient from './doctor-appointment-details-client'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function DoctorAppointmentDetailsPage(props: PageProps) {
  const { id } = await props.params
  const resolvedSearchParams = (await props.searchParams) ? await props.searchParams : undefined
  return (
    <DoctorAppointmentDetailsClient
      id={id}
      searchParams={resolvedSearchParams}
    />
  )
}
