import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "./Navbar";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { NotificationToasts } from "@/components/notifications/NotificationToasts";
import { ErrorToasts } from "@/components/ui/ErrorToasts";
import { useAuth } from "@/context/AuthContext";

const DEMO_EMAIL: string | undefined = import.meta.env.VITE_DEMO_EMAIL;

export function Layout() {
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  const isDemoUser =
    !!DEMO_EMAIL && user?.email?.toLowerCase() === DEMO_EMAIL.toLowerCase();

  useEffect(() => {
    if (session) {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    }
  }, [session?.access_token, queryClient]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {isDemoUser && (
        <div className="bg-indigo-50 px-4 py-1.5 text-center text-sm text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
          Viewing the demo account — data is read-only. Sign up to build your own
          watchlists and portfolios.
        </div>
      )}
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <ChatDrawer />
      <NotificationToasts />
      <ErrorToasts />
    </div>
  );
}
