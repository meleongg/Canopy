"use client";

import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";
import type {
  ChineseScriptPreference,
  ReadingSizePreference,
} from "@/lib/user-preferences";

type Theme = "light" | "dark";

const READING_SIZE_STORAGE_KEY = "canopy-reading-size";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  readingSize: ReadingSizePreference;
  setReadingSize: (readingSize: ReadingSizePreference) => void;
  chineseScript: ChineseScriptPreference;
  setChineseScript: (script: ChineseScriptPreference) => void;
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
  const [readingSize, setReadingSizeState] = useState<ReadingSizePreference>(
    () => {
      if (typeof window === "undefined") return "default";
      const stored = window.localStorage.getItem(READING_SIZE_STORAGE_KEY);
      return stored === "large" || stored === "extra-large"
        ? stored
        : "default";
    },
  );
  const [chineseScript, setChineseScriptState] =
    useState<ChineseScriptPreference>("match-cards");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.readingSize = readingSize;
  }, [readingSize]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("canopy-theme", nextTheme);
  }, []);
  const setReadingSize = useCallback(
    (nextReadingSize: ReadingSizePreference) => {
      setReadingSizeState(nextReadingSize);
      document.documentElement.dataset.readingSize = nextReadingSize;
      window.localStorage.setItem(READING_SIZE_STORAGE_KEY, nextReadingSize);
    },
    [],
  );
  const setChineseScript = useCallback((nextScript: ChineseScriptPreference) => {
    setChineseScriptState(nextScript);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, readingSize, setReadingSize, chineseScript, setChineseScript }),
    [theme, setTheme, readingSize, setReadingSize, chineseScript, setChineseScript],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
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
