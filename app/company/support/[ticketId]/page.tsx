import TicketView from '@/components/recruiter_dashboard/support/TicketView';

interface Props {
  params: { ticketId: string };
}

export default function CompanySupportTicketPage({ params }: Props) {
  const { ticketId } = params;
  return (
    <main className="min-h-screen p-6 bg-slate-50">
      <TicketView ticketId={ticketId} />
    </main>
  );
}
