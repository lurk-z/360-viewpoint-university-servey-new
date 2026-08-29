import AdminSectionPage from '../../../../components/admin/AdminSectionPage';

export default async function AdminProgramsPage({
  searchParams
}: {
  readonly searchParams: Promise<{ faculty?: string | string[]; status?: string | string[] }>;
}) {
  const { faculty, status } = await searchParams;
  return (
    <AdminSectionPage
      section="programs"
      requestedFacultyId={typeof faculty === 'string' ? faculty : undefined}
      requestedStatus={typeof status === 'string' ? status : undefined}
    />
  );
}
