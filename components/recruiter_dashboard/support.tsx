import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export default function Support() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support</h1>
        <p className="text-slate-600">Contact support or view help resources</p>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Get Help</h2>
            <p className="text-slate-600 mt-1">If you're experiencing issues, reach out to our support team.</p>
            <Button className="mt-4">Contact Support</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
