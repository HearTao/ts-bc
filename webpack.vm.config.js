const path = require('path')

module.exports = [
  {
    mode: 'production',
    entry: './src/vm.ts',
    output: {
      path: path.resolve(__dirname, 'libs'),
      filename: 'vm.js',
      library: 'TSBC',
    },
    module: {
      rules: [{
        test: /\.ts$/,
        use: 'ts-loader'
      }]
    },
    resolve: {
      extensions: ['.js', '.ts']
    }
  }]