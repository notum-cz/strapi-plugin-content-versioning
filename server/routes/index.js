'use strict';

const adminRoutes = require('./admin');
const clientRoutes = require('./client');

module.exports = {
  admin: {
    type: 'admin',
    routes: adminRoutes,
  },
  'content-api': {
    type: 'content-api',
    routes: clientRoutes,
  },
};
