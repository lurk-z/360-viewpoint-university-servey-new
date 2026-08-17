import { redirect } from 'next/navigation';

export default function LegacyAdminHotspotsPage(): never {
  redirect('/admin/places');
}
