/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // pdf-parse a mammoth jsou CJS balíčky – musí zůstat jako Node.js externals,
  // Next.js 14.1+ používá serverExternalPackages (nahradilo experimental.serverComponentsExternalPackages)
  serverExternalPackages: ["pdf-parse", "mammoth"],
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
