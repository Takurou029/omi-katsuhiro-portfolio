/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的サイトとして書き出す（Vercel / 任意の静的ホスティングで配信可能）。
  // すべてのデータ処理はクライアント側（localStorage）で完結する。
  output: "export",
  images: {
    // 静的エクスポートでは Next の画像最適化サーバーが使えないため無効化。
    unoptimized: true,
  },
  // 末尾スラッシュを付けることで静的ホスティングでのルーティングを安定させる。
  trailingSlash: true,
};

export default nextConfig;
