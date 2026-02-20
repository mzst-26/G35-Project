/**
 * Custom hook for managing appeals data
 */
import { useState } from "react";
import { Appeal, AppealStatus } from "@/types/admin-dashboard";

const sampleAppeals: Appeal[] = [
  {
    id: "1",
    userName: "John Smith",
    reason: "Disputed penalty charge",
    date: "2026-02-03",
    status: "open",
  },
  {
    id: "2",
    userName: "Sarah Johnson",
    reason: "Job cancellation appeal",
    date: "2026-02-02",
    status: "open",
  },
  {
    id: "3",
    userName: "Mike Davis",
    reason: "Rating dispute",
    date: "2026-02-01",
    status: "pending",
  },
  {
    id: "4",
    userName: "Emma Wilson",
    reason: "Payment issue",
    date: "2026-01-31",
    status: "pending",
  },
  {
    id: "5",
    userName: "Robert Brown",
    reason: "Account suspension appeal",
    date: "2026-01-25",
    status: "closed",
  },
  {
    id: "6",
    userName: "Lisa Anderson",
    reason: "Contract dispute",
    date: "2026-01-20",
    status: "closed",
  },
];

export const useAppeals = () => {
  const [appeals] = useState<Appeal[]>(sampleAppeals);

  const getAppealsCount = (status: AppealStatus): number => {
    return appeals.filter((appeal) => appeal.status === status).length;
  };

  const getFilteredAppeals = (status: AppealStatus): Appeal[] => {
    return appeals.filter((appeal) => appeal.status === status);
  };

  const getAppealById = (id: string): Appeal | undefined => {
    return appeals.find((appeal) => appeal.id === id);
  };

  return {
    appeals,
    getAppealsCount,
    getFilteredAppeals,
    getAppealById,
  };
};
