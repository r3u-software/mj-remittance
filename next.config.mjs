import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(import.meta.dirname),
  // The floating dark "N" dev-tools badge Next.js shows during `next
  // dev` — never appears in production, but distracting locally.
  devIndicators: false,
};

export default nextConfig;
