import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // Les imports PDF passent par une Server Action : la limite par défaut est 1 Mo.
    // 30 Mo couvre la limite applicative de 25 Mo + l'encodage multipart.
    serverActions: { bodySizeLimit: "30mb" },
  },
  serverExternalPackages: ["better-sqlite3", "@node-rs/argon2", "pdfjs-dist"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "microphone=(), camera=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
