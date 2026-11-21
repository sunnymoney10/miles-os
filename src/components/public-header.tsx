import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandMark } from "./brand";

export function PublicHeader() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
      <BrandMark />
      <nav aria-label="Site" className="flex items-center gap-2">
        <Link to="/privacy" className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
          Privacy
        </Link>
        {signedIn ? (
          <Button asChild size="sm">
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link to="/auth">Parent sign in</Link>
          </Button>
        )}
      </nav>
    </header>
  );
}