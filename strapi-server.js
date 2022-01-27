'use strict';

const bootstrap = require('./server/bootstrap');
const register = require('./server/register');
const services = require('./server/services');
const routes = require('./server/routes');
const controllers = require('./server/controllers');

module.exports = () => ({
  register,
  bootstrap,
  routes,
  controllers,
  services,
});
