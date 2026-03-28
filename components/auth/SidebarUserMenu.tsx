"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, ChevronUp, UserCircle2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getSessionMe, logout } from "@/lib/auth/client";

interface SidebarUserMenuProps {
  onGoToSettings: () => void;
  onAfterAction?: () => void;
}

function getDisplayName(email: string): string {
  const localPart = email.split("@")[0] ?? "User";
  return localPart.replace(/[._-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getInitials(email: string): string {
  const displayName = getDisplayName(email);
  const parts = displayName.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "U").toUpperCase();
}

export function SidebarUserMenu({ onGoToSettings, onAfterAction }: SidebarUserMenuProps) {
  const router = useRouter();
  const { user, sessionId, clearUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fallbackEmail = "user@infra.app";
  const email = user?.email ?? fallbackEmail;
  const displayName = useMemo(() => getDisplayName(email), [email]);
  const initials = useMemo(() => getInitials(email), [email]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const handleGoToSettings = () => {
    onGoToSettings();
    setIsOpen(false);
    onAfterAction?.();
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      let activeSessionId = sessionId;

      if (!activeSessionId) {
        const session = await getSessionMe();
        activeSessionId = session.sessionId ?? null;
      }

      if (!activeSessionId) {
        throw new Error("Session id not found");
      }

      await logout({ sessionId: activeSessionId });
      clearUser();
      router.push("/login");
      router.refresh();
    } catch {
      clearUser();
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
      onAfterAction?.();
    }
  };

  return (
    <div ref={containerRef} className="relative p-4 border-t border-slate-200">
      <button
        type="button"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50 transition"
        onClick={() => setIsOpen((open) => !open)}
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
          <ChevronUp className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      <div
        className={`absolute left-4 right-4 bottom-[calc(100%+0.5rem)] rounded-xl border border-slate-200 bg-white shadow-lg p-2 transition-all duration-200 ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
        <button
          type="button"
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          onClick={handleGoToSettings}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>

        <button
          type="button"
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-60"
          onClick={() => {
            void handleLogout();
          }}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? <UserCircle2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
          {isLoggingOut ? "Logging out..." : "Log out"}
        </button>
      </div>
    </div>
  );
}
