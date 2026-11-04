import * as React from "react";
import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { FinwiseProvider } from "@/store/finwise-store";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useGoalCelebrations } from "@/hooks/use-goal-celebrations";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  // Keep authenticated controls out of the iPhone's translucent system area.
  // The login route retains the root's edge-to-edge photo viewport.
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=contain" },
      { name: "color-scheme", content: "light dark" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, signOut, accessConfirmed } = useAuth();
  const needsAccessConfirmation = !loading && !!user && !accessConfirmed;
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && (!user || needsAccessConfirmation)) {
      navigate({ to: "/auth", search: { redirect: location.pathname, confirmed: false } });
    }
  }, [loading, user, navigate, location.pathname, needsAccessConfirmation]);

  if (loading || !user || needsAccessConfirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const name =
    user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0];
  const initials = (name || "U").slice(0, 2).toUpperCase();

  return (
    <FinwiseProvider>
      <AppShell
        userId={user.id}
        name={name}
        fallbackAvatar={user.user_metadata?.avatar_url}
        initials={initials}
        signOut={signOut}
        t={t}
      />
    </FinwiseProvider>
  );
}

import { ThemeToggle } from "@/components/ThemeToggle";

function AppShell({
  userId,
  name,
  fallbackAvatar,
  initials,
  signOut,
  t,
}: {
  userId: string;
  name: string;
  fallbackAvatar?: string;
  initials: string;
  signOut: () => Promise<void> | void;
  t: (k: string) => string;
}) {
  useGoalCelebrations();

  React.useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    const previousBackground = root.style.backgroundColor;
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousThemeColor = themeMeta?.content;
    root.style.overflow = "hidden";
    root.style.backgroundColor = "var(--background)";
    root.dataset.appShell = "true";
    const syncTheme = () => {
      if (themeMeta) themeMeta.content = getComputedStyle(document.body).backgroundColor;
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      root.style.overflow = previous;
      root.style.backgroundColor = previousBackground;
      delete root.dataset.appShell;
      if (themeMeta && previousThemeColor !== undefined) themeMeta.content = previousThemeColor;
    };
  }, []);

  // Start the authenticated area at the top after the login keyboard closes.
  // This runs only when the shell mounts, preserving navigation scroll history.
  React.useEffect(() => {
    const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const frame = window.requestAnimationFrame(resetScroll);
    const keyboardSettled = window.setTimeout(resetScroll, 350);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(keyboardSettled);
    };
  }, []);

  // Apply theme on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("axispay-theme");
    const root = window.document.documentElement;
    if (saved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  // Avatar sincronizado entre dispositivos via tabela profiles
  const [avatarUrl, setAvatarUrl] = React.useState<string | undefined>(fallbackAvatar);
  React.useEffect(() => {
    let alive = true;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const url = data?.avatar_url;
        if (url) setAvatarUrl(url);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  return (
    <SidebarProvider>
      <div className="fixed inset-0 flex h-dvh w-full overflow-hidden bg-background pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] transition-colors duration-300">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <header className="relative z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background px-3 pt-[env(safe-area-inset-top)] sm:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>

            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <NotificationsBell />
              <ThemeToggle />

              <div className="flex items-center gap-2 mr-1 sm:mr-2">
                <Avatar className="h-8 w-8 border border-border/50">
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[150px] truncate text-sm font-medium sm:inline">
                  {name}
                </span>
              </div>
              <LanguageSwitcher compact />
              <Button
                size="sm"
                variant="ghost"
                className="h-9 px-2 sm:px-3 text-muted-foreground hover:text-destructive"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("common.signout")}</span>
              </Button>
            </div>
          </header>
          <main id="app-scroll-content" className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
