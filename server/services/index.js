"use strict";

const permissions = require("./permissions");
const coreApi = require("./core-api");
const contentTypes = require("./content-types");
const lifecycles = require("./lifecycles");
const entityServiceDecorator = require('./entity-service-decorator');

module.exports = {
  permissions,
  "core-api": coreApi,
  "content-types": contentTypes,
  lifecycles: lifecycles,
  'entity-service-decorator': entityServiceDecorator,
};
