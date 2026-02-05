"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface UserListViewProps {
  listType: "trade" | "company";
  onBack: () => void;
}

export default function UserListView({ listType, onBack }: UserListViewProps) {
  const title = listType === "trade" ? "Trade Users" : "Company Users";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-600">View and manage {title.toLowerCase()}</p>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <p className="text-slate-600 text-center">No users to display</p>
      </div>
    </div>
  );
}
