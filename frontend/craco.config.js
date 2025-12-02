// Load configuration from environment or config file
const path = require('path');

// Environment variable overrides
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === 'true',
};

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      
      // Disable hot reload completely if environment variable is set
      if (config.disableHotReload) {
        // Remove hot reload related plugins
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
        });
        
        // Disable watch mode
        webpackConfig.watch = false;
        webpackConfig.watchOptions = {
          ignored: /.*/, // Ignore all files
        };
      } else {
        // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
          ],
        };
      }
      
      // Ignore source map warnings from node_modules
      if (webpackConfig.module && webpackConfig.module.rules) {
        webpackConfig.module.rules.forEach((rule) => {
          if (rule.use) {
            rule.use.forEach((use) => {
              if (use.loader && use.loader.includes('source-map-loader')) {
                use.options = {
                  ...use.options,
                  filterSourceMappingUrl: () => false,
                };
              }
            });
          }
        });
      }
      
      // Alternative: Filter out source-map-loader warnings
      if (webpackConfig.ignoreWarnings) {
        webpackConfig.ignoreWarnings = [
          ...webpackConfig.ignoreWarnings,
          /Failed to parse source map/,
        ];
      } else {
        webpackConfig.ignoreWarnings = [/Failed to parse source map/];
      }
      
      return webpackConfig;
    },
  },
};