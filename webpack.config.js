var path = require('path');

module.exports = {
  entry: ['babel-polyfill', './app/component.js'],
  output: {
    filename: 'component.js',
    path: path.resolve(__dirname, 'build'),
    libraryTarget: 'commonjs'
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.js/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['flow', 'env']
          }
        }
      }
    ]
  }
};
