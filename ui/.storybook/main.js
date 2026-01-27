module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  docs: {
    autodocs: true,
  },
  webpackFinal: async (config) => {
    // Find and remove the existing SVG rule
    const fileLoaderRule = config.module.rules.find((rule) => rule.test?.test?.('.svg'))
    if (fileLoaderRule) {
      fileLoaderRule.exclude = /\.svg$/
    }

    // Add SVGR loader for SVG files
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            exportType: 'named',
          },
        },
        'url-loader',
      ],
    })

    return config
  },
}
