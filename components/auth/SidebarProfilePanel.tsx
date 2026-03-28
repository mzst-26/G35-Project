"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, LogOut, Settings, User } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { AuthApiError, getSessionMe, logout } from "@/lib/auth/client";

type SidebarProfilePanelProps = {
  userLabel?: string;
  onOpenSettings: () => void;
  logoutRedirectPath: string;
};

export function SidebarProfilePanel({
  userLabel,
  onOpenSettings,
  logoutRedirectPath,
}: SidebarProfilePanelProps) {
  const { sessionId, clearUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const displayName = useMemo(() => {
    if (!userLabel) {
      return "Profile";
    }
    const value = userLabel.trim();
    if (!value) {
      return "Profile";
    }
    if (!value.includes("@")) {
      return value;
    }
    return value.split("@")[0] || "Profile";
  }, [userLabel]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  const handleOpenSettings = () => {
    onOpenSettings();
    setErrorMessage(null);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setErrorMessage(null);

    try {
      let resolvedSessionId = sessionId;
      if (!resolvedSessionId) {
        const session = await getSessionMe();
        resolvedSessionId = session.sessionId ?? null;
      }

      if (!resolvedSessionId) {
        throw new Error("Unable to determine the current session.");
      }

      await logout({ sessionId: resolvedSessionId });
      clearUser();
      setIsOpen(false);
      window.location.assign(logoutRedirectPath);
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 401) {
        clearUser();
        setIsOpen(false);
        window.location.assign(logoutRedirectPath);
        return;
      }

      setErrorMessage("Logout failed. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-between text-slate-700 hover:bg-slate-100"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
            <User className="h-4 w-4" />
          </span>
          <span className="truncate">{displayName}</span>
        </span>
        <ChevronRight className="h-4 w-4 text-slate-500" />
      </Button>

      <div
        className={`absolute bottom-full left-0 right-0 z-[95] mb-2 origin-bottom transition-all duration-200 ${
          isOpen
            ? "pointer-events-auto opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 translate-y-2 scale-95"
        }`}
      >
        <aside
          className="relative rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-2xl"
          role="dialog"
          aria-modal="false"
          aria-label="Profile panel"
        >
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Account</p>
            <h3 className="text-base text-slate-900 truncate">{displayName}</h3>
            {userLabel && userLabel !== displayName && (
              <p className="text-sm text-slate-500 truncate">{userLabel}</p>
            )}
          </div>

          <div className="space-y-2">
            <div
              className={`transition-all duration-200 ${
                isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}
              style={{ transitionDelay: isOpen ? "70ms" : "0ms" }}
            >
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleOpenSettings}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
            <div
              className={`transition-all duration-200 ${
                isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}
              style={{ transitionDelay: isOpen ? "130ms" : "0ms" }}
            >
              <Button
                type="button"
                variant="destructive"
                className="w-full justify-start gap-2"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Button>
            </div>
            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
          </div>

          <div className="absolute -bottom-2 left-8 h-4 w-4 rotate-45 border-b border-r border-slate-200 bg-slate-50" />
        </aside>
      </div>
    </div>
  );
}
