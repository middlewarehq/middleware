const analyzer = require('@next/bundle-analyzer');
const { loadEnvConfig } = require('@next/env');
const images = require('next-images');

loadEnvConfig('../.env');

console.info('BUILD ENV:', process.env.NEXT_PUBLIC_APP_ENVIRONMENT);

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === 'true'
});

const genericPlugins = [
  [
    images,
    {
      fileExtensions: [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'ico',
        'webp',
        'jp2',
        'avif'
      ],
      webpack(config) {
        config.module.rules.push({
          test: /\.svg$/,
          use: ['@svgr/webpack']
        });
        config.module.rules.push({
          test: /\.(ttf)$/i,
          use: [
            {
              loader: 'url-loader',
              options: {
                encoding: 'base64'
              }
            }
          ]
        });

        return config;
      }
    }
  ],
  [withBundleAnalyzer]
];

const staticOverrides = {
  staticPageGenerationTimeout: 2000,
  images: {
    disableStaticImages: true
  },
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  productionBrowserSourceMaps: false,
  async rewrites() {
    return [
      {
        source: '/api/tunnel/logrocket/:path*',
        destination: 'https://r.lr-in.com/:path*'
      },
      {
        source: '/scripts/tunnel/logrocket/:path*',
        destination: 'https://cdn.ingest-lr.com/:path*'
      },
      {
        source: '/api/tunnel/mixpanel/:path*',
        destination: 'https://api-js.mixpanel.com/:path*'
      },
      {
        source: '/.well-known/microsoft-identity-association.json',
        destination: '/api/auth-x/well-known/ms'
      },
      {
        source: '/org-logo/:path*',
        destination: 'https://logo.clearbit.com/:path*'
      }
    ];
  }
};

const compose = (plugins, config = {}) =>
  plugins.reduce(
    (conf, [plugin, pluginConf]) => plugin({ ...conf, ...(pluginConf || {}) }),
    config
  );

const webpackOverride = {
  /**
   * @param {import('webpack').Configuration} config
   * @returns {import('webpack').Configuration}
   */
  webpack(config) {
    config.module.rules.push({
      test: /\.tsx?$/,
      exclude: './pages/scaffolded/'
    });
    return config;
  }
};

const plugins =
  process.env.NEXT_PUBLIC_APP_ENVIRONMENT === 'development'
    ? compose(genericPlugins, staticOverrides)
    : compose(genericPlugins, { ...staticOverrides, ...webpackOverride });

module.exports = plugins;
