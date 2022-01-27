"use strict";

const permissions = require("./permissions");
const coreApi = require("./core-api");
const contentTypes = require("./content-types");
const lifecycles = require("./lifecycles");

module.exports = {
  permissions,
  "core-api": coreApi,
  "content-types": contentTypes,
  lifecycles: lifecycles,
};
