"use client";

/* eslint-disable @next/next/no-img-element -- Next Image triggers a Next 16 prerender useRef failure in the global shell. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  History,
  Leaf,
  LogIn,
  LogOut,
  Moon,
  MessageCircle,
  Menu,
  Sprout,
  Sun,
  TreePine,
  Settings,
  Search,
} from "lucide-react";
import logoDark from "@/app/assets/icons/canopy-logo-dark.svg";
import logoLight from "@/app/assets/icons/canopy-logo-light.svg";
import { useCanopyTheme } from "@/app/providers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query-keys";
import type { UserPreferences } from "@/lib/user-preferences";

type ShellUser = {
  name?: string | null;
};

const privateNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/collection", label: "Collection" },
  { href: "/explore", label: "Explore" },
  { href: "/overstory", label: "The Overstory" },
  { href: "/understory/setup", label: "The Understory" },
  { href: "/history", label: "History" },
];

const mobileNav = [
  { href: "/dashboard", label: "Dashboard", icon: Sprout },
  { href: "/overstory", label: "Overstory", icon: BookOpen },
  { href: "/understory/setup", label: "Understory", icon: MessageCircle },
  { href: "/history", label: "History", icon: History },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<ShellUser | null>(null);
  const { theme, setChineseScript, setReadingSize, setTheme } = useCanopyTheme();
  const isOnboarding = pathname === "/onboarding";
  const isLandingPage = pathname === "/";
  const { data: preferences } = useQuery({
    queryKey: queryKeys.userPreferences,
    enabled: Boolean(user),
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Could not load preferences.");
      return (await response.json()) as UserPreferences;
    },
  });

  useEffect(() => {
    let active = true;

    void fetch("/api/auth/get-session")
      .then((response) => (response.ok ? response.json() : null))
      .then((session: { user?: ShellUser } | null) => {
        if (active) {
          setUser(session?.user ?? null);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
        }
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!preferences) return;
    setTheme(preferences.theme);
    setReadingSize(preferences.readingSize);
    setChineseScript(preferences.chineseScript);
  }, [preferences, setChineseScript, setReadingSize, setTheme]);

  async function signOut() {
    await authClient.signOut();
    queryClient.removeQueries({ queryKey: queryKeys.userPreferences });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-2 px-4 sm:gap-4 md:px-8">
          <Link
            className="flex shrink-0 items-center gap-3"
            href={user ? "/dashboard" : "/"}
          >
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
              <img
                alt=""
                className="block dark:hidden"
                height="40"
                src={logoLight.src}
                width="40"
              />
              <img
                alt=""
                className="hidden dark:block"
                height="40"
                src={logoDark.src}
                width="40"
              />
            </span>
            <span className="font-serif text-xl font-black">Canopy</span>
          </Link>

          {!isLandingPage ? (
            <nav
              className={cn(
                "hidden items-center gap-1 min-[1200px]:flex",
                isOnboarding && "min-[1200px]:hidden",
              )}
            >
              {privateNav.map((item) => (
                <Button
                  asChild
                  className={cn(
                    "h-9",
                    pathname === item.href && "bg-card text-foreground",
                  )}
                  key={item.href}
                  size="sm"
                  variant="ghost"
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </nav>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            {user && !isOnboarding && !isLandingPage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Open navigation menu"
                    className="hidden min-[768px]:inline-flex min-[1200px]:hidden"
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Menu />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Navigate</DropdownMenuLabel>
                  {privateNav.map((item) => (
                    <DropdownMenuItem asChild key={item.href}>
                      <Link href={item.href}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <Button
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              size="icon"
              type="button"
              variant="outline"
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="rounded-full data-[state=open]:bg-primary data-[state=open]:text-primary-foreground"
                    size="icon"
                    variant="outline"
                  >
                    <Avatar className="size-8 border-0">
                      <AvatarFallback>
                        {user.name?.slice(0, 1).toUpperCase() ?? "C"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.name ?? "Canopy"}</DropdownMenuLabel>
                  {!isOnboarding ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard">
                          <TreePine className="mr-2 size-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/collection">
                          <BookOpen className="mr-2 size-4" />
                          Collection
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/explore">
                          <Search className="mr-2 size-4" />
                          Explore dictionary
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/overstory">
                          <Leaf className="mr-2 size-4" />
                          The Overstory
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/history">
                          <History className="mr-2 size-4" />
                          Practice history
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings">
                          <Settings className="mr-2 size-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">
                  <LogIn />
                  Sign in
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div
        className={cn(
          "flex flex-1 flex-col",
          user && !isOnboarding && "pb-20 md:pb-0",
        )}
      >
        {children}
      </div>

      {user && !isOnboarding ? (
        <nav
          aria-label="Primary navigation"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
        >
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href === "/understory/setup" &&
                pathname.startsWith("/understory/"));

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
                href={item.href}
                key={item.href}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      {["/", "/privacy", "/terms", "/attributions"].includes(pathname) ? (
        <footer className="border-t border-border bg-card/60">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              <p>Canopy grows vocabulary through review, context, and dialogue.</p>
              <p className="mt-1 text-xs">© 2026 Canopy. All rights reserved.</p>
            </div>
            <nav aria-label="Legal" className="flex gap-4">
              <Link className="hover:text-foreground" href="/privacy">
                Privacy
              </Link>
              <Link className="hover:text-foreground" href="/terms">
                Terms
              </Link>
              <Link className="hover:text-foreground" href="/attributions">
                Attributions
              </Link>
            </nav>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
