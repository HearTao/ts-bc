const path = require('path')

module.exports = [
  {
    mode: 'production',
    output: {
      path: path.resolve(__dirname, 'libs'),
      filename: 'browser.js',
      library: 'TSBC'
    },
    node: { fs: 'empty' },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader'
        }
      ]
    },
    externals: {
      typescript: 'TypeScript'
    },
    resolve: {
      extensions: ['.js', '.ts']
    }
  },
  {
    mode: 'production',
    entry: 'typescript',
    output: {
      path: __dirname,
      filename: 'typescript.js',
      library: 'TypeScript'
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader'
        }
      ]
    },
    externals: {
      // typescript: 'TypeScript'
      // ['@microsoft/typescript-etw']: false
    },
    resolve: {
      extensions: ['.js', '.ts'],
      alias: {
        ['@microsoft/typescript-etw']: path.resolve(__dirname, 'mock.js')
      }
    }
  }
]
