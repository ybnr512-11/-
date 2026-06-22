/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
    outputFileTracingIncludes: {
      "/api/**/*": [
        "./node_modules/better-sqlite3/**/*",
        "./node_modules/bindings/**/*",
      ],
    },
  },
};

module.exports = nextConfig;
