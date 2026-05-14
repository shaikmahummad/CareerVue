const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

let config = getDefaultConfig(projectRoot);

// Watch the monorepo root so Metro sees all workspace packages
config.watchFolders = [monorepoRoot];

// Look in both apps/mobile/node_modules AND the monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config = withNativeWind(config, { input: "./global.css" });

// Fix Windows path issue: backslashes in paths like \node_modules and \nativewind
// contain \n which Metro misreads as a newline escape sequence. Normalize to forward slashes.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const normalized = moduleName.replace(/\\/g, "/");
  const resolver = originalResolveRequest ?? context.resolveRequest;
  return resolver(context, normalized !== moduleName ? normalized : moduleName, platform);
};

module.exports = config;
