"use client";

import { useState, useEffect } from "react";
import type { AdminSettings } from "@/types/admin-settings";

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);

  useEffect(() => {
    // TODO: Replace with real fetch
    setSettings({
      siteTitle: "Example Site",
      allowRegistrations: true,
      maintenanceMode: false,
      defaultUserRole: "trade",
    });
  }, []);

  return { settings, setSettings };
}

export default useAdminSettings;
