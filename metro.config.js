// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add additional module resolver configurations
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    '@': __dirname,
  },
};

module.exports = config; 