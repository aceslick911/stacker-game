const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/stacker.ts",
  watch: true,
  output: {
    filename: "bundle.js"
  },
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: [".ts", ".tsx", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.less$/,
        use: [
          {
            loader: "style-loader" // creates style nodes from JS strings
          },
          {
            loader: "css-loader" // translates CSS into CommonJS
          },
          {
            loader: "less-loader",
            options: {
              paths: [path.resolve(__dirname, "css")]
            } // compiles Less to CSS
          }
        ]
      },
      { test: /\.tsx?$/, loader: "ts-loader" }
    ]
  }
};
