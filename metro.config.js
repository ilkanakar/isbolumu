const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

if (process.env.EXPO_PUBLIC_ADS !== '1') {
  const stub = path.resolve(__dirname, 'src/services/ads-native-stub.js');
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'react-native-google-mobile-ads') {
      return { type: 'sourceFile', filePath: stub };
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
