const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith("react-is/cjs/react-is.development.js")) {
    return {
      filePath: path.resolve(__dirname, "node_modules/react-is/cjs/react-is.development.js"),
      type: "sourceFile",
    };
  }
  if (moduleName.endsWith("react-is/cjs/react-is.production.min.js")) {
    return {
      filePath: path.resolve(__dirname, "node_modules/react-is/cjs/react-is.production.min.js"),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
