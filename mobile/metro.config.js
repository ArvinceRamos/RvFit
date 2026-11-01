// Metro config. The app shares the web app's plain TypeScript logic in ../src/lib (calculations,
// validation, data loaders), imported as "@/lib/...". Metro must watch that folder. Those files import
// only types from packages, but a package they did import would be looked up here first.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../src/lib");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

module.exports = config;
