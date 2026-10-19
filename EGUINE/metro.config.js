const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-web/dist/exports/BackHandler': require.resolve('./src/shims/backhandler.web.js'),
  'react-native/Libraries/Utilities/LoadingView': require.resolve('./src/shims/LoadingView.js'),
};

module.exports = config;
