"use strict";

const { getService, getLatestRawQuery } = require("../../../utils");

// Disable versioning on CT -> Delete all older versions of entities
module.exports = async ({ oldContentTypes, contentTypes }) => {
  const { isVersionedContentType } = getService("content-types");

  if (!oldContentTypes) {
    return;
  }

  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    if (
      isVersionedContentType(oldContentType) &&
      !isVersionedContentType(contentType)
    ) {
      const model = strapi.getModel(uid);

      const latestQuery = getLatestRawQuery(model)
      const selectedLastVersions = await strapi.db.connection.raw(latestQuery)

      const idsToKeep = selectedLastVersions?.rows?.map((r) => r.id) || [];

      await strapi.db.query(uid).deleteMany({
        where: {
          id: {
            $notIn: idsToKeep,
          },
        },
      });
    }
  }
};
