import AdminSectionPage from '../../../../components/admin/AdminSectionPage';

export default async function AdminPlacesPage({ searchParams }: { readonly searchParams: Promise<{ status?: string | string[] }> }) {
  const { status } = await searchParams;
  return <AdminSectionPage section="places" requestedStatus={typeof status === 'string' ? status : undefined} />;
}
