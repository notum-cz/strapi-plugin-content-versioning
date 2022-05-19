"use strict";

const { v4: uuid } = require("uuid");
const _ = require("lodash");
const { getService } = require("../utils");

module.exports = {
  async createVersion(slug, data, user) {
    const model = await strapi.getModel(slug);

    const { createNewVersion } = getService("content-types");

    // setup data, get old version and new version number
    let olderVersions = [];
    let publishedId = null;
    if (!data.vuid) {
      data.vuid = uuid();
      data.versionNumber = 1;
      data.updatedBy = user?.id;
      data.createdBy = user?.id;
    } else {
      olderVersions = await strapi.db.query(slug).findMany({
        where: { vuid: data.vuid },
        populate: {
          createdBy: true,
        },
      });

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
        data.createdBy = user?.id;
      }

      data.updatedBy = user?.id;

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

  async findAllForUser(slug, user) {
    if (!user) {
      return [];
    }

    const allItems = await strapi.db.query(slug).findMany({
      populate: {
        versions: true,
      },
      where: {
        createdBy: user.id,
        isVisibleInListView: true,
      },
    });

    return allItems;
  },
};
