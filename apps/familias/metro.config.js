// Metro en monorepo: hay que vigilar la raiz para que los cambios en
// packages/* recarguen la app, y resolver modulos tanto en la app como en la raiz.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const raizProyecto = __dirname;
const raizMonorepo = path.resolve(raizProyecto, '../..');

const config = getDefaultConfig(raizProyecto);

config.watchFolders = [raizMonorepo];
config.resolver.nodeModulesPaths = [
  path.resolve(raizProyecto, 'node_modules'),
  path.resolve(raizMonorepo, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
