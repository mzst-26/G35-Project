import { requireUserRole } from '@/lib/auth/server';

export default async function CompanyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUserRole('recruiter');
  return children;
}
