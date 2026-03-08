/**
 * Custom hook for managing admin users data
 */
import { useState } from "react";
import { User, UserType } from "@/types/admin-dashboard";

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

export const useAdminUsers = () => {
  const [users] = useState<Map<UserType, User[]>>(
    new Map([
      ["trade", tradeUsers],
      ["company", companyUsers],
    ])
  );

  const getUsersByType = (type: UserType): User[] => {
    return users.get(type) || [];
  };

  const getUserById = (id: string, type: UserType): User | undefined => {
    const userList = users.get(type);
    return userList?.find((user) => user.id === id);
  };

  const getActiveUsersCount = (): number => {
    const allUsers = Array.from(users.values()).flat();
    return allUsers.filter((user) => user.status === "active").length;
  };

  const getSuspendedUsersCount = (): number => {
    const allUsers = Array.from(users.values()).flat();
    return allUsers.filter((user) => user.status === "suspended").length;
  };

  const getTotalUsersCount = (type: UserType): number => {
    return getUsersByType(type).length;
  };

  return {
    getUsersByType,
    getUserById,
    getActiveUsersCount,
    getSuspendedUsersCount,
    getTotalUsersCount,
  };
};
