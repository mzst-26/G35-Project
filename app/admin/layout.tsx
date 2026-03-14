import { requireUserRole } from '@/lib/auth/server';

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUserRole('admin');
  return children;
}
