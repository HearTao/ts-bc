import * as path from 'path'
import * as webpack from 'webpack'

export default function WebpackConfig(): webpack.Configuration[] {
  return [
  {
    mode: 'production',
    output: {
      path: path.resolve(__dirname, 'libs'),
      filename: 'browser.js',
      library: 'TSBC',
    },
    module: {
      rules: [{
        test: /\.ts$/,
        use: 'ts-loader'
      }]
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
      library: 'TypeScript',
    },
    module: {
      rules: [{
        test: /\.ts$/,
        use: 'ts-loader'
      }]
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
  }]
}