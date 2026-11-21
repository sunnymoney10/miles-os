import { Link } from "@tanstack/react-router";

export function BrandMark({ to = "/" }: { to?: "/" | "/dashboard" }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2 rounded-full" aria-label="Miles OS home">
      <span aria-hidden className="relative flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift">
        <span className="font-display text-lg leading-none">M</span>
        <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-spark ring-2 ring-background" />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">Miles OS</span>
    </Link>
  );
}