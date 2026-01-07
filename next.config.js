/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

// Only apply PWA in production build
if (process.env.NODE_ENV === "production") {
  const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
  });
  module.exports = withPWA(nextConfig);
} else {
  module.exports = nextConfig;
}
