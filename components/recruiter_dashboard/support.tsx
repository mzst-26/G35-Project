import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export default function Support() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now just mark submitted and reset form
    setSubmitted(true);
    setShowForm(false);
    setTitle("");
    setDetails("");
    setDate("");
  };

  const handleCancel = () => {
    setShowForm(false);
    setTitle("");
    setDetails("");
    setDate("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support</h1>
          <p className="text-slate-600">Contact support or view help resources</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setSubmitted(false); }}>
            Contact Support
          </Button>
        )}
      </div>

      {submitted && (
        <Card className="p-4 bg-green-50 border-green-100">
          <p className="text-sm text-green-800">Support request submitted. We'll be in touch shortly.</p>
        </Card>
      )}

      {showForm ? (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Details</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm"
                rows={5}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit">Submit</Button>
              <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Get Help</h2>
              <p className="text-slate-600 mt-1">If you're experiencing issues, reach out to our support team.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
