import ProfessionalDashboardClient from './professional-dashboard-client'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProfessionalDashboardPage(props: PageProps) {
  const resolvedSearchParams = (await props.searchParams) ? await props.searchParams : undefined
  return (
    <ProfessionalDashboardClient
      searchParams={resolvedSearchParams ?? undefined}
    />
  )
}
