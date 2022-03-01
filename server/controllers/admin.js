'use strict';

const { getService } = require('../utils');

module.exports = {
  async save(ctx) {
    const { slug } = ctx.request.params;
    const { body: data } = ctx.request;
    const { user } = ctx.state;

    const { createVersion } = getService('core-api');

    return await createVersion(slug, data, user);
  },
};
