/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

// Disable PWA on Netlify to avoid build issues
// PWA will only work in local production builds
if (process.env.NODE_ENV === "production" && !process.env.NETLIFY && !process.env.VERCEL) {
  try {
    const withPWA = require("next-pwa")({
      dest: "public",
      register: true,
      skipWaiting: true,
    });
    module.exports = withPWA(nextConfig);
  } catch (error) {
    console.warn("PWA configuration skipped:", error.message);
    module.exports = nextConfig;
  }
} else {
  module.exports = nextConfig;
}
