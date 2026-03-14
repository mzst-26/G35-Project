import { requireUserRole } from '@/lib/auth/server';

export default async function TradeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUserRole('trade');
  return children;
}
