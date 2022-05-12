"use strict";

const { getService } = require("../../../utils");
const { v4: uuid } = require("uuid");

// if versioning is enabled set default version and vuid
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
      !isVersionedContentType(oldContentType) &&
      isVersionedContentType(contentType)
    ) {
      const ids = (await strapi.db.query(uid).findMany({ select: "id" })).map(
        (item) => item.id
      );

      for (const id of ids) {
        await strapi.db
          .query(uid)
          .update({ where: { id }, data: { versionNumber: 1, vuid: uuid(), isVisibleInListView: true } });
      }
    }
  }
};
