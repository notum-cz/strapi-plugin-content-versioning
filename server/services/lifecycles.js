"use strict";

const beforeCreate = require("./lifecycles/beforeCreate");
const beforeUpdate = require("./lifecycles/beforeUpdate");
const beforeDelete = require("./lifecycles/beforeDelete");

module.exports = () => ({
  beforeCreate,
  beforeUpdate,
  beforeDelete,
});
