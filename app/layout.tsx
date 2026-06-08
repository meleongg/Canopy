import type { Metadata } from "next";
import { Merriweather, Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/app/service-worker-register";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const appleTitleMeta = {
  name: "apple-mobile-web-app-title",
  content: "Canopy",
};

export const metadata: Metadata = {
  title: "Canopy",
  description:
    "A vocabulary workspace with The Sprouting Queue, The Overstory Sandbox, and The Understory Chat.",
  applicationName: "Canopy",
  appleWebApp: {
    capable: true,
    title: "Canopy",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon0.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png" }],
  },
  other: {
    [appleTitleMeta.name]: appleTitleMeta.content,
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFBF7" },
    { media: "(prefers-color-scheme: dark)", color: "#1A221E" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${merriweather.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-title" content="Canopy" />
      </head>
      <body className="min-h-full">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
