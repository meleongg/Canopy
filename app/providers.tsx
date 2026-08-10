"use client";

import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const stored = window.localStorage.getItem("canopy-theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("canopy-theme", nextTheme);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useCanopyTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useCanopyTheme must be used inside Providers.");
  }

  return context;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider delayDuration={200}>
          <ToastProvider>{children}</ToastProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
