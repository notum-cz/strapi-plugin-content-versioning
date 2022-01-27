"use strict";

const beforeCreate = require("./lifecycles/beforeCreate");
const beforeUpdate = require("./lifecycles/beforeUpdate");

module.exports = () => ({
  beforeCreate,
  beforeUpdate,
});
