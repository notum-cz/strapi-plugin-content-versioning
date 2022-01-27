"use strict";

const { getService } = require("../../../utils");

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

      const idsToKeep = (
        await strapi.db.connection.raw(
          `SELECT id, vuid, version_number FROM ${model.collectionName} WHERE (vuid, version_number) IN (SELECT vuid, MAX(version_number) FROM ${model.collectionName} GROUP BY vuid)`
        )
      ).rows.map((r) => r.id);

      await strapi.db.query(uid).delete({
        where: {
          id: {
            $notIn: idsToKeep,
          },
        },
      });
    }
  }
};
