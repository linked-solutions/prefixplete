const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

module.exports = {
  entry: path.resolve(__dirname, 'src', 'prefixplete.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'prefixplete.js',
    libraryTarget: 'umd',
    libraryExport: "default",
    library: 'Prefixplete'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            "presets": [
              ["@babel/preset-env", {
                "targets": " > 1%, IE 11, chrome 41",
                "spec": true,
                "useBuiltIns": "entry",
                "corejs": 3,
                "forceAllTransforms": true,
                "ignoreBrowserslistConfig": true,
                "modules": "commonjs",
                "debug": false, 
                "include": ["@babel/plugin-transform-arrow-functions"]
              }]
            ],
            "plugins": [
                ["@babel/plugin-transform-arrow-functions", { "spec": false }],
                ["@babel/plugin-transform-runtime",
                  {
                    "regenerator": true
                  }
                ],
                ["@babel/plugin-transform-object-assign"]
            ]
          }
        }
      }
    ]
  },
  externals: {
    'node-fetch': 'fetch'
  },
  optimization: {
    minimize: true
  },
  devtool: 'source-map',
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require("./package.json").version)
    })
  
  ],
  devServer: {
    compress: true,
    disableHostCheck: true
  }
};