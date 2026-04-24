const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = function (options) {
  return {
    ...options,
    entry: {
      main: './src/main.ts',
      worker: './src/worker.ts',
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: '[name].js',
    },
    externals: [
      nodeExternals({
        modulesDir: path.resolve(__dirname, '../node_modules'),
        allowlist: [/^@open-receipt-ocr\/types/],
      }),
      nodeExternals({
        allowlist: [/^@open-receipt-ocr\/types/],
      }),
      'onnxruntime-node',
      '@napi-rs/canvas',
      'ppu-ocv',
    ],
  };
};
