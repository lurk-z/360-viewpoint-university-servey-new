import AdminSectionPage from '../../../../components/admin/AdminSectionPage';

export default async function AdminPlacesPage({ searchParams }: {
  readonly searchParams: Promise<{ status?: string | string[]; q?: string | string[] }>;
}) {
  const { status, q } = await searchParams;
  return <AdminSectionPage
    section="places"
    requestedStatus={typeof status === 'string' ? status : undefined}
    requestedQuery={typeof q === 'string' ? q : undefined}
  />;
}
