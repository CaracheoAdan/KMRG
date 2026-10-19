const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Watch monorepo root so workspace dependencies can be tracked
config.watchFolders = [monorepoRoot];

// 2. Prioritize project node_modules before monorepo node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Force resolution of react and react-native to mobile-app's installed copies
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

// 4. Block root react and react-native to avoid multiple React copies / module conflicts
const rootReact = path.resolve(monorepoRoot, 'node_modules', 'react').replace(/\\/g, '[/\\\\]');
const rootReactNative = path.resolve(monorepoRoot, 'node_modules', 'react-native').replace(/\\/g, '[/\\\\]');

const currentBlockList = config.resolver.blockList;
const customBlockList = [
  new RegExp(`^${rootReact}([/\\\\].*)?$`),
  new RegExp(`^${rootReactNative}([/\\\\].*)?$`),
];

if (Array.isArray(currentBlockList)) {
  config.resolver.blockList = [...currentBlockList, ...customBlockList];
} else if (currentBlockList instanceof RegExp) {
  config.resolver.blockList = [currentBlockList, ...customBlockList];
} else {
  config.resolver.blockList = customBlockList;
}

module.exports = config;
