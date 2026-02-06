import AppointmentDetailClient from './appointment-detail-client'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AppointmentDetailPage(props: PageProps) {
  const { id } = await props.params
  const resolvedSearchParams = (await props.searchParams) ? await props.searchParams : undefined
  const prescriptionParam = resolvedSearchParams?.prescription
  const labRequestParam = resolvedSearchParams?.labRequest
  return (
    <AppointmentDetailClient
      id={id}
      prescriptionParam={typeof prescriptionParam === 'string' ? prescriptionParam : undefined}
      labRequestParam={typeof labRequestParam === 'string' ? labRequestParam : undefined}
    />
  )
}
