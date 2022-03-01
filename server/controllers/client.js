'use strict';

const { getService } = require('../utils');

module.exports = {
  async post(ctx) {
    const { request, params = {}, state = {} } = ctx;
    const { body: newVersionData } = request;
    const { slug, postId } = params;
    const { user } = state;

    const data = await strapi.db.query(slug).findOne({ where: { id: postId } });
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
};
