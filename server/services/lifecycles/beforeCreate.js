"use strict";

const { v4: uuid } = require("uuid");

const beforeCreate = (event) => {
  const { params } = event;
  const vuid = params && params.data && params.data.vuid;
  if (!vuid) {
    event.params.data.vuid = uuid();
  }
};

module.exports = beforeCreate;
