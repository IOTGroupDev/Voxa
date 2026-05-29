const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
    path.resolve(workspaceRoot, 'shared'),
];

config.resolver.extraNodeModules = {
    '@voxa/shared': path.resolve(workspaceRoot, 'shared/src'),
};

module.exports = config;