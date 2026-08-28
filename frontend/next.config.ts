import type { NextConfig } from "next";
import withPWA from "next-pwa";
import withBundleAnalyzer from "@next/bundle-analyzer";
import withTM from "next-translate-plugin";

const isProd = process.env.NODE_ENV === "production";
const isDev = process.env.NODE_ENV === "development";
const isStaging = process.env.NODE_ENV === "staging";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  compiler: {
    removeConsole: isProd,
    styledComponents: true,
  },

  images: {
    domains: [
      "localhost",
      "api.todolist.com",
      "cdn.todolist.com",
      "avatars.githubusercontent.com",
      "lh3.googleusercontent.com",
      "platform-lookaside.fbsbx.com",
      "s3.amazonaws.com",
      "s3.us-east-1.amazonaws.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  experimental: {
    typedRoutes: true,
    serverActions: true,
    optimizeCss: true,
    optimizePackageImports: [
      "@mui/material",
      "@mui/icons-material",
      "lucide-react",
      "recharts",
    ],
    turbo: {
      resolveAlias: {
        "@": "./src",
        "@app": "./src/app",
        "@components": "./src/components",
        "@hooks": "./src/hooks",
        "@lib": "./src/lib",
        "@types": "./src/types",
        "@schemas": "./src/schemas",
        "@utils": "./src/utils",
        "@services": "./src/services",
        "@store": "./src/store",
        "@context": "./src/context",
        "@constants": "./src/constants",
        "@enums": "./src/enums",
        "@validators": "./src/validators",
        "@helpers": "./src/helpers",
        "@interfaces": "./src/interfaces",
        "@styles": "./src/styles",
        "@public": "./public",
        "@test": "./test",
      },
    },
  },

  poweredByHeader: false,
  generateEtags: true,
  httpAgentOptions: {
    keepAlive: true,
  },

  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
      };
    }

    config.module.rules.push({
      test: /\.(graphql|gql)$/,
      exclude: /node_modules/,
      loader: "graphql-tag/loader",
    });

    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
              name: "vendors",
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
              name: "common",
            },
            mui: {
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
              name: "mui",
              priority: 10,
              chunks: "all",
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
              name: "react",
              priority: 20,
              chunks: "all",
            },
          },
        },
      };
    }

    return config;
  },

  transpilePackages: [
    "@mui/material",
    "@mui/icons-material",
    "@mui/x-data-grid",
    "@mui/x-date-pickers",
    "date-fns",
    "recharts",
  ],

  serverRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
    secret: process.env.SECRET || "secret",
  },

  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000",
    appName: process.env.NEXT_PUBLIC_APP_NAME || "TodoList Pro",
    environment: process.env.NODE_ENV || "development",
  },

  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/old-tasks/:path*",
        destination: "/tasks/:path*",
        permanent: true,
      },
      {
        source: "/user/:id",
        destination: "/profile/:id",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
      {
        source: "/ws/:path*",
        destination: `${process.env.NEXT_PUBLIC_WS_URL}/ws/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, must-revalidate",
          },
        ],
      },
    ];
  },

  sassOptions: {
    includePaths: ["./src/styles"],
    prependData: `@import "variables.scss";`,
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
};

const withPWAConfig = withPWA({
  dest: "public",
  disable: isDev,
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "image-cache",
        expiration: {
          maxEntries: 1000,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /^https?:\/\/.*\.(js|css)$/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        },
      },
    },
    {
      urlPattern: /^https?:\/\/api/,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60,
        },
      },
    },
  ],
});

const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const config = withTM({
  ...nextConfig,
  i18n: {
    locales: ["en", "es", "fr", "de", "zh", "ja"],
    defaultLocale: "en",
    localeDetection: true,
  },
});

export default withPWAConfig(withBundleAnalyzerConfig(config));
