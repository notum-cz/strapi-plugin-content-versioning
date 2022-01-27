'use strict';

const pluginId = require("../pluginId");

const getCoreStore = () => {
  return strapi.store({ type: 'plugin', name: pluginId });
};

// retrieve a local service
const getService = name => {
  return strapi.plugin(pluginId).service(name);
};

module.exports = {
  getService,
  getCoreStore,
};
