import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "./Navbar";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { NotificationToasts } from "@/components/notifications/NotificationToasts";
import { useAuth } from "@/context/AuthContext";

export function Layout() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (session) {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    }
  }, [session?.access_token, queryClient]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <ChatDrawer />
      <NotificationToasts />
    </div>
  );
}
