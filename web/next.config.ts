import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

// The browser calls /api/* on this origin; Next.js forwards it to the Express API.
// This keeps the session cookie first-party, so it works on Safari and mobile browsers.
const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;