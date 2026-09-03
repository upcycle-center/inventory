/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @react-pdf/renderer pulls in native/WASM deps (fontkit, yoga-layout)
  // that webpack's bundling breaks in a serverless function — this makes
  // Next require it directly via Node instead of bundling it, which is
  // the documented fix for it crashing at runtime on Vercel.
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
    // pdfkit (underneath @react-pdf/renderer) reads its standard-font
    // data files off disk at runtime rather than require()-ing them, so
    // Next's automatic file tracing misses them and Vercel's deployed
    // function can't find them ("Cannot find module .../Helvetica.cjs").
    // Force them into the trace for both PDF routes.
    outputFileTracingIncludes: {
      "/api/count-sheet/pdf": ["./node_modules/pdfkit/js/standard-fonts/**"],
      "/api/inventory-value/pdf": ["./node_modules/pdfkit/js/standard-fonts/**"],
    },
  },
};

module.exports = nextConfig;
