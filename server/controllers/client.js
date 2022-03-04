'use strict';

const { getService } = require('../utils');

module.exports = {
  async create(ctx) {
    const { request, params = {}, state = {} } = ctx;
    const { body: newVersionData } = request;
    const { slug, itemId } = params;
    const { user } = state;

    const data = await strapi.db.query(slug).findOne({ where: { id: itemId } });
    // Clean dates to get new version date
    const now = new Date();
    data.createdAt = now;
    data.updatedAt = now;

    const { createVersion } = getService('core-api');

    const newData = {
      ...data,
      ...newVersionData,
    };

    return await createVersion(slug, newData, user);
  },

  async findAllForUser(ctx) {
    const { params = {}, state = {} } = ctx;
    const { slug } = params;
    const { user } = state;

    const { findAllForUser } = getService('core-api');

    return await findAllForUser(slug, user);
  },
};
