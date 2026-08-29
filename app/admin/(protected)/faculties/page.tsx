import AdminSectionPage from '../../../../components/admin/AdminSectionPage';

export default async function AdminFacultiesPage({ searchParams }: { readonly searchParams: Promise<{ status?: string | string[] }> }) {
  const { status } = await searchParams;
  return <AdminSectionPage section="faculties" requestedStatus={typeof status === 'string' ? status : undefined} />;
}
