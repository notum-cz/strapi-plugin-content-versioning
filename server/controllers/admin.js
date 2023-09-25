"use strict";

const { v4: uuid } = require("uuid");
const { getService } = require("../utils");

module.exports = {
  async save(ctx) {
    const { slug } = ctx.request.params;
    const { body: data } = ctx.request;
    const { user } = ctx.state;

    const { createVersion } = getService("core-api");

    // Clone version tree
    if (data.isDuplicatingEntry) {
      const allVersions = await strapi.db.query(slug).findMany({
        where: {
          vuid: data.vuid,
          //locale: data.locale // Clone all or only this locale ?
        },
        sort: [{ versionNumber: "asc" }], // Incrementaly create versions
      });

      let initialCloneVersion = null;
      const newVuid = uuid();

      for (const versionData of allVersions) {
        versionData.vuid = newVuid;
        const created = await createVersion(slug, versionData, user, {});

        // identify first clone version to be returned
        if (
          created.locale == data.locale &&
          created.versionNumber == data.versionNumber
        ) {
          initialCloneVersion = created;
        }
      }
      return initialCloneVersion;
    }

    return await createVersion(slug, data, user, ctx.request.query);
  },
};
