"use strict";

const _ = require("lodash");
const uuid = require("uuid");
const { getService } = require("../utils");

module.exports = {
  async save(ctx) {
    const { slug } = ctx.request.params;
    const { body: data } = ctx.request;

    const { createNewVersion } = getService("content-types");

    const model = await strapi.getModel(slug);

    // setup data, get old version and new version number
    let olderVersions = [];
    let publishedId = null;
    if (!data.vuid) {
      data.vuid = uuid();
      data.versionNumber = 1;
      data.updatedBy = ctx.state.user.id;
      data.createdBy = ctx.state.user.id;
    } else {
      olderVersions = await strapi.db.query(slug).findMany({
        where: { vuid: data.vuid },
        populate: {
          createdBy: true,
        },
      });

      console.log(olderVersions);

      publishedId = await strapi.db.query(slug).findOne({
        select: ["id", "vuid", "versionNumber", "createdAt"],
        where: { vuid: data.vuid, publishedAt: { $notNull: true } },
      });

      const latestVersion = _.maxBy(olderVersions, (v) => v.versionNumber);
      const latestVersionNumber = latestVersion && latestVersion.versionNumber;
      data.versionNumber = (latestVersionNumber || 0) + 1;

      try {
        if (olderVersions && olderVersions.length > 0) {
          data.createdBy = olderVersions[0].createdBy.id;
        }
      } catch (e) {
        // Fallback set logged user ID
        data.createdBy = ctx.state.user.id;
      }

      data.updatedBy = ctx.state.user.id;

      if (!publishedId) {
        await strapi.db.query(slug).updateMany({
          where: {
            id: {
              $in: olderVersions.map((v) => v.id),
            },
          },
          data: {
            isVisibleInListView: false,
          },
        });
      }
    }
    data.versions = olderVersions.map((v) => v.id);

    // remove old ids
    const newData = createNewVersion(slug, data);
    const result = await strapi.entityService.create(slug, {
      data: {
        ...newData,
        publishedAt: null,
        isVisibleInListView: !publishedId,
      },
    });
    for (const version of data.versions) {
      await strapi.db.connection.raw(
        `INSERT INTO ${model.collectionName}_versions_links VALUES (${version},${result.id})`
      );
    }
    return result;
  },
};
