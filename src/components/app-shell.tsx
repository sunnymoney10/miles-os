import type { ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookHeart, Home, LogOut, ScrollText, Users, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandMark } from "./brand";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/circle", label: "Family circle", icon: Users },
  { to: "/shared", label: "Shared with me", icon: Gift },
  { to: "/records", label: "Records", icon: ScrollText },
  { to: "/privacy", label: "Privacy", icon: BookHeart },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen paper-grain">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <BrandMark to="/dashboard" />
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut aria-hidden /> Sign out
          </Button>
        </div>
        <nav aria-label="Main" className="mx-auto max-w-6xl overflow-x-auto px-2">
          <ul className="flex gap-1 pb-2">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                >
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}