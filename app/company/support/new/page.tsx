import TicketForm from '@/components/recruiter_dashboard/support/TicketForm';

export default function CompanySupportNewPage() {
  // Page-level composition only
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <TicketForm />
    </main>
  );
}
