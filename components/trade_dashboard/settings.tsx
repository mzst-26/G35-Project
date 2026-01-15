"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Settings() {
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const router = useRouter();

  const handleLogout = () => {
    // placeholder: clear auth here
    alert("You have been logged out.");
    router.push("/login");
  };

  const handleDelete = () => {
    const ok = confirm("Are you sure you want to delete your account? This cannot be undone.");
    if (!ok) return;
    // placeholder: call API to delete account
    alert("Account deletion requested. You will be redirected.");
    router.push("/");
  };

  return (
    <div className="mt-6 rounded-md border p-6 bg-white max-w-2xl">
      <h4 className="text-lg font-medium mb-4">Settings</h4>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Email notifications</div>
          <div className="text-xs text-slate-500">Receive updates about jobs and messages.</div>
        </div>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
            className="h-4 w-4 mr-2"
          />
          <span className="text-sm">{emailNotifications ? 'On' : 'Off'}</span>
        </label>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={handleLogout}>Log out</Button>
        <Button variant="destructive" onClick={handleDelete}>Delete account</Button>
      </div>
    </div>
  );
}
