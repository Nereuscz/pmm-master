/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    // pdf-parse a mammoth jsou CJS balíčky – Next.js 14.x je musí načítat
    // nativně přes Node.js require(), ne přes webpack bundle.
    // (V Next.js 15+ se tento klíč přejmenoval na serverExternalPackages)
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"]
  }
};

export default nextConfig;
