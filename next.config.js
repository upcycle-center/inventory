/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @react-pdf/renderer pulls in native/WASM deps (fontkit, yoga-layout)
  // that webpack's bundling breaks in a serverless function — this makes
  // Next require it directly via Node instead of bundling it, which is
  // the documented fix for it crashing at runtime on Vercel.
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

module.exports = nextConfig;
