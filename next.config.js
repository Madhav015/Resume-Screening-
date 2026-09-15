/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb', // allow multi-file resume uploads through server actions
    },
  },
};

module.exports = nextConfig;
