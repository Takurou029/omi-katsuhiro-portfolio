import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ProgressProvider } from "@/lib/store";
import { ThemeApplier } from "@/components/ThemeApplier";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";

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
    statusBarStyle: "default",
    title: "NSCA-CPT",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// 初期テーマをペイント前に適用してちらつきを防ぐ。既定はライト。
const themeInitScript = `
(function(){try{
  var raw = localStorage.getItem('nsca-cpt-progress-v1');
  var theme = 'light';
  if (raw) {
    var s = JSON.parse(raw);
    if (s && s.settings && s.settings.theme) theme = s.settings.theme;
    // v1 データの 'system'（旧既定）はライト扱いに移行する。
    if (theme === 'system' && (!s.version || s.version < 2)) theme = 'light';
  }
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
      <body className="bg-white text-slate-900 antialiased dark:bg-surface-dark dark:text-slate-100">
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
          {/* PC: 左サイドバー＋広いコンテンツ / モバイル: 下部ナビ */}
          <div className="mx-auto flex min-h-[100dvh] w-full max-w-screen-xl">
            <SideNav />
            <div className="flex min-w-0 flex-1 flex-col">
              <main id="main" className="flex-1 pb-24 lg:pb-10">
                {children}
              </main>
              <BottomNav />
            </div>
          </div>
        </ProgressProvider>
      </body>
    </html>
  );
}
