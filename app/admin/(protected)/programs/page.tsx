import AdminSectionPage from '../../../../components/admin/AdminSectionPage';

export default async function AdminProgramsPage({
  searchParams
}: {
  readonly searchParams: Promise<{ faculty?: string | string[] }>;
}) {
  const { faculty } = await searchParams;
  return (
    <AdminSectionPage
      section="programs"
      requestedFacultyId={typeof faculty === 'string' ? faculty : undefined}
    />
  );
}
