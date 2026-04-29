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
    externals: {
      // We explicitly mark native and optional modules as commonjs externals.
      // This tells Webpack to generate 'require("module-name")' at runtime
      // instead of attempting to bundle them or treating them as global variables.
      // This fixes 'SyntaxError' on scoped packages (like @fastify/static) and
      // 'ReferenceError' on native drivers (like sqlite3).
      'sqlite3': 'commonjs sqlite3',
      'onnxruntime-node': 'commonjs onnxruntime-node',
      '@napi-rs/canvas': 'commonjs @napi-rs/canvas',
      'node-llama-cpp': 'commonjs node-llama-cpp',
      'ppu-paddle-ocr': 'commonjs ppu-paddle-ocr',
      'ppu-ocv': 'commonjs ppu-ocv',
      '@fastify/static': 'commonjs @fastify/static',
      '@fastify/view': 'commonjs @fastify/view',
      'fastify': 'commonjs fastify',
    },
  };
};
