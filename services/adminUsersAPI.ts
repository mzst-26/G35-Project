import type { AdminUserDetail, AdminUserSummary } from "@/types/admin-users";

let MOCK_USERS: AdminUserDetail[] = [
  {
    id: "TRD-1234",
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+44 7700 900123",
    type: "trade",
    specialty: "Plumber",
    location: "London",
    address: "123 High Street, London, E1 1AA",
    joinDate: "2024-03-15",
    completedJobs: 127,
    cancelledJobs: 3,
    rating: 4.8,
    totalReviews: 98,
    status: "active",
    verified: true,
    totalEarnings: 28450,
    pendingPayments: 1200,
    activePenalties: 0,
    totalPenalties: 1,
    bio: "Experienced plumber with over 10 years in the industry.",
    skills: ["Emergency Repairs", "Boiler Installation"],
    certifications: ["Gas Safe Registered", "City & Guilds Level 3"],
    recentActivity: [
      { date: "2025-11-23", action: "Completed job #JOB-5678", type: "success" },
    ],
  },
  {
    id: "COM-4567",
    name: "BuildCo Ltd",
    email: "admin@buildco.com",
    phone: "+44 7700 900456",
    type: "company",
    industry: "Construction",
    location: "Manchester",
    address: "456 Business Park, Manchester, M1 2BB",
    joinDate: "2024-01-10",
    postedJobs: 89,
    completedJobs: 76,
    cancelledJobs: 5,
    rating: 4.6,
    totalReviews: 72,
    status: "active",
    verified: true,
    totalSpent: 145680,
    pendingPayments: 3400,
    activePenalties: 0,
    totalPenalties: 2,
    bio: "Leading construction company in the Northwest.",
    companySize: "50-100 employees",
    registrationNumber: "GB123456789",
    vatNumber: "GB987654321",
    recentActivity: [
      { date: "2025-11-24", action: "Posted new job #JOB-5679", type: "success" },
    ],
  },
];

export async function listAdminUsers(): Promise<AdminUserSummary[]> {
  // TODO: Replace with real HTTP GET /admin/users
  const summaries: AdminUserSummary[] = MOCK_USERS.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    type: u.type,
    location: u.location,
    joinDate: u.joinDate,
    rating: u.rating,
    status: u.status,
    verified: u.verified,
    specialty: u.specialty,
    industry: u.industry,
    completedJobs: u.completedJobs,
    postedJobs: u.postedJobs,
  }));
  return Promise.resolve(structuredClone(summaries));
}

export async function getAdminUserById(userId: string): Promise<AdminUserDetail | null> {
  // TODO: Replace with real HTTP GET /admin/users/:id
  const found = MOCK_USERS.find((u) => u.id === userId);
  return Promise.resolve(found ? structuredClone(found) : null);
}

export async function updateAdminUser(user: AdminUserDetail): Promise<void> {
  // TODO: Replace with real HTTP PUT /admin/users/:id
  MOCK_USERS = MOCK_USERS.map((u) => (u.id === user.id ? structuredClone(user) : u));
  return Promise.resolve();
}

export async function suspendAdminUser(userId: string, reason: string): Promise<void> {
  // TODO: Replace with real HTTP POST /admin/users/:id/suspend
  MOCK_USERS = MOCK_USERS.map((u) =>
    u.id !== userId
      ? u
      : {
          ...u,
          status: "suspended",
          suspensionReason: reason,
          suspensionDate: new Date().toISOString().slice(0, 10),
        },
  );
  return Promise.resolve();
}

export async function unsuspendAdminUser(userId: string): Promise<void> {
  // TODO: Replace with real HTTP POST /admin/users/:id/unsuspend
  MOCK_USERS = MOCK_USERS.map((u) =>
    u.id !== userId
      ? u
      : { ...u, status: "active", suspensionReason: undefined, suspensionDate: undefined },
  );
  return Promise.resolve();
}