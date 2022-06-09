"use strict";

const { v4: uuid } = require("uuid");
const _ = require("lodash");
const { getService } = require("../utils");
const { singular } = require("pluralize");

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
          localizations: true,
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
      populate: {
        localizations: true,
      },
    });

    // set same localization for all previous version
    const attrName = singular(model.collectionName);

    const allLocalizations = olderVersions.flatMap((olderVersion) => {
      return olderVersion.localizations.map((item) => ({
        id: item.id,
        vuid: item.vuid,
        locale: item.locale,
      }));
    });

    const uniqueLocalizations = _.uniqBy(allLocalizations, "vuid");

    const allVersionsWithoutLang = (
      await strapi.db.query(slug).findMany({
        where: { vuid: { $in: uniqueLocalizations.map((item) => item.vuid) } },
        populate: {
          createdBy: true,
          localizations: true,
        },
      })
    ).map((item) => item.id);

    for (const entityId of allVersionsWithoutLang) {
      await strapi.db.connection.raw(
        `DELETE FROM ${model.collectionName}_localizations_links WHERE ${attrName}_id=${entityId} AND inv_${attrName}_id=${result.id}`
      );

      await strapi.db.connection.raw(
        `INSERT INTO ${model.collectionName}_localizations_links VALUES (${entityId},${result.id})`
      );
    }

    // set latest for all different localizations for latest

    for (const localization of result.localizations) {
      await strapi.db.connection.raw(
        `UPDATE ${model.collectionName}_localizations_links SET inv_${attrName}_id=${result.id} WHERE ${attrName}_id=${localization.id}`
      );
    }

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
