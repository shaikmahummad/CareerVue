const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;

let config = getDefaultConfig(projectRoot);

// SDK 56's getDefaultConfig auto-detects watchFolders and nodeModulesPaths
// for monorepo workspaces — no manual overrides needed.

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
