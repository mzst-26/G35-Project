"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { UserType } from "@/types/admin-dashboard";

interface UserListViewProps {
  listType: UserType;
  onBack: () => void;
}

export default function UserListView({
  listType,
  onBack,
}: UserListViewProps): React.JSX.Element {
  const PAGE_SIZE_OPTIONS = [100, 50, 25] as const;
  const [pageSize, setPageSize] = useState<number>(100);
  const [pageIndex, setPageIndex] = useState<number>(0);

  const { getUsersByType, isLoading, error, loadUsersPage, getPagination } = useAdminUsers({ autoLoad: false });
  const title = useMemo(
    () => (listType === "trade" ? "Trade Users" : "Company Users"),
    [listType]
  );
  const users = useMemo(() => getUsersByType(listType), [listType, getUsersByType]);
  const pagination = useMemo(() => getPagination(listType), [getPagination, listType]);

  useEffect(() => {
    const offset = pageIndex * pageSize;
    void loadUsersPage(listType, pageSize, offset);
  }, [listType, loadUsersPage, pageIndex, pageSize]);

  const total = pagination.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = pageIndex + 1;

  function handlePageSizeChange(nextSize: number): void {
    setPageSize(nextSize);
    setPageIndex(0);
  }

  function goNextPage(): void {
    setPageIndex((prev) => (prev + 1 < totalPages ? prev + 1 : prev));
  }

  function goPreviousPage(): void {
    setPageIndex((prev) => (prev > 0 ? prev - 1 : 0));
  }

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

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Rows per page:</span>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <Button
              key={size}
              type="button"
              size="sm"
              variant={pageSize === size ? "default" : "outline"}
              onClick={() => handlePageSizeChange(size)}
              disabled={isLoading}
            >
              {size}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={goPreviousPage} disabled={isLoading || pageIndex === 0}>
            Previous
          </Button>
          <span className="min-w-[110px] text-center text-sm text-slate-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={goNextPage} disabled={isLoading || currentPage >= totalPages}>
            Next
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        {isLoading ? (
          <p className="px-6 py-8 text-center text-slate-600">Loading users...</p>
        ) : error ? (
          <p className="px-6 py-8 text-center text-red-600">{error}</p>
        ) : users.length === 0 ? (
          <p className="px-6 py-8 text-center text-slate-600">No users found for this category.</p>
        ) : (
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
                      {user.id || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {user.email || "—"}
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
                      {user.joinDate || "—"}
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
        )}
      </div>
    </div>
  );
}
