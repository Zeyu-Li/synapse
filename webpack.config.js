const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = [{
  entry: ['./src/index.scss', './src/main.ts'],
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.scss$/,
        type: 'asset/resource',
        generator: {
          filename: 'bundle.css',
        },
        use: [
          {
            loader: 'sass-loader',
            options: {
              webpackImporter: false,
              sassOptions: {
                loadPaths: ['./node_modules'],
                quietDeps: true,
              },
            }
          },
        ]
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ]
  },
  devServer: {
    static: path.join(__dirname, 'dist'),
    compress: true,
    host: '0.0.0.0',
    port: 8080,
    open: false
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.html'
    })
  ]
}];
