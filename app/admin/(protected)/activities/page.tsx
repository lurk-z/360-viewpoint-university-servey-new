import AdminSectionPage from '../../../../components/admin/AdminSectionPage';

export default async function AdminActivitiesPage({ searchParams }: { readonly searchParams: Promise<{ status?: string | string[] }> }) {
  const { status } = await searchParams;
  return <AdminSectionPage section="activities" requestedStatus={typeof status === 'string' ? status : undefined} />;
}
