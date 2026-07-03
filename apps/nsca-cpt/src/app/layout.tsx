import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ProgressProvider } from "@/lib/store";
import { ThemeApplier } from "@/components/ThemeApplier";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "NSCA-CPT 試験対策",
  description:
    "NSCA-CPT（認定パーソナルトレーナー）受験対策アプリ。毎日の習慣化・弱点優先の出題・本番形式の模試で合格を目指す。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NSCA-CPT",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// 初期テーマをペイント前に適用してちらつきを防ぐ。
const themeInitScript = `
(function(){try{
  var raw = localStorage.getItem('nsca-cpt-progress-v1');
  var theme = 'system';
  if (raw) { var s = JSON.parse(raw); if (s && s.settings && s.settings.theme) theme = s.settings.theme; }
  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 antialiased dark:bg-surface-dark dark:text-slate-100">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ProgressProvider>
          <ThemeApplier />
          <ServiceWorkerRegister />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:font-bold focus:text-slate-900"
          >
            本文へスキップ
          </a>
          <div className="mx-auto flex min-h-[100dvh] w-full max-w-screen-sm flex-col">
            <main id="main" className="flex-1 pb-24">
              {children}
            </main>
            <BottomNav />
          </div>
        </ProgressProvider>
      </body>
    </html>
  );
}
