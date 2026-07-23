// Babel — SDK 52+. Le plugin expo-router est inclus dans babel-preset-expo
// (plus besoin de "expo-router/babel", déprécié depuis le SDK 50).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
