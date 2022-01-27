const pluginPkg = require('../package.json');

const pluginId = pluginPkg.name.replace(/^@notum-cz\/strapi-plugin-/i, '');

module.exports = pluginId;
