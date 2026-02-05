"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

interface UserListViewProps {
  listType: "trade" | "company";
  onBack: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "suspended";
  joinDate: string;
}

const tradeUsers: User[] = [
  {
    id: "T001",
    name: "John Smith",
    email: "john.smith@email.com",
    status: "active",
    joinDate: "2025-11-15",
  },
  {
    id: "T002",
    name: "Mike Johnson",
    email: "mike.j@email.com",
    status: "active",
    joinDate: "2025-12-02",
  },
  {
    id: "T003",
    name: "Sarah Williams",
    email: "s.williams@email.com",
    status: "suspended",
    joinDate: "2025-10-20",
  },
  {
    id: "T004",
    name: "Robert Davis",
    email: "robert.d@email.com",
    status: "active",
    joinDate: "2026-01-10",
  },
];

const companyUsers: User[] = [
  {
    id: "C001",
    name: "Tech Solutions Ltd",
    email: "contact@techsolutions.com",
    status: "active",
    joinDate: "2025-09-05",
  },
  {
    id: "C002",
    name: "BuildCorp Industries",
    email: "info@buildcorp.com",
    status: "active",
    joinDate: "2025-11-20",
  },
  {
    id: "C003",
    name: "Green Energy Co",
    email: "admin@greenenergy.com",
    status: "active",
    joinDate: "2025-12-15",
  },
  {
    id: "C004",
    name: "Metro Construction",
    email: "contact@metroconstruction.com",
    status: "suspended",
    joinDate: "2025-08-12",
  },
];

export default function UserListView({ listType, onBack }: UserListViewProps) {
  const title = listType === "trade" ? "Trade Users" : "Company Users";
  const users = listType === "trade" ? tradeUsers : companyUsers;

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
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Join Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {user.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {user.joinDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-black hover:bg-slate-100"
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
