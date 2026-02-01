module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@services': './src/services',
            '@stores': './src/stores',
            '@hooks': './src/hooks',
            '@constants': './src/constants',
            '@types': './src/types',
          },
        },
      ],
    ],
  };
};
