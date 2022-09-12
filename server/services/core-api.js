"use strict";

const { v4: uuid } = require("uuid");
const _ = require("lodash");
const { getService } = require("../utils");


module.exports = {
  async createVersion(slug, data, user, options) {
    const model = await strapi.getModel(slug);

    const { createNewVersion } = getService("content-types");

    // setup data, get old version and new version number
    let olderVersions = [];
    let currentLocalVersions = [];
    let localizedVersions = {};

    let publishedIds = null;
    if (options?.plugins?.i18n?.locale) {
      data.locale = options?.plugins?.i18n?.locale;
    }

    console.log({ ...data, options: options?.plugins?.i18n })

    if (!data.vuid && !options?.plugins?.i18n?.relatedEntityId) {
      data.vuid = uuid();
      data.versionNumber = 1;
      data.updatedBy = user?.id;
      data.createdBy = user?.id;
    } else {
      let filter = {};
      if (data.vuid) {
        filter.vuid = data.vuid
      } else if (data.localizations) {
        filter = { $or: data.localizations.map((l) => { return { id: l.id ?? l } }) };

      } else if (options?.plugins?.i18n?.relatedEntityId) {
        filter.id = options?.plugins?.i18n?.relatedEntityId
      }

      olderVersions = await strapi.db.query(slug).findMany({
        where: filter,
        populate: {
          createdBy: true,
          localizations: true,
        },
      });

      publishedIds = await strapi.db.query(slug).findMany({
        select: ["id", "vuid", "versionNumber", "createdAt", "locale"],
        where: { vuid: data.vuid, publishedAt: { $notNull: true } },
      });

      if (data.locale || options?.plugins?.i18n?.locale) {
        olderVersions.forEach(v => {
          if (v.vuid) {
            data.vuid = v.vuid;
          }
          if (v.locale) {
            if (!localizedVersions[v.locale]) localizedVersions[v.locale] = [];
            localizedVersions[v.locale].push(v);
          }
        });
        currentLocalVersions = localizedVersions[data.locale] ?? [];
      }

      const latestVersion = _.maxBy(currentLocalVersions, (v) => v.versionNumber);
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

      if (!publishedIds) {
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
    data.versions = currentLocalVersions.map((v) => v.id);

    // remove old ids
    const newData = createNewVersion(slug, data);

    const result = await strapi.entityService.create(slug, {
      data: {
        ...newData,
        locale: data.locale,
        publishedAt: null,
        isVisibleInListView: !publishedIds,
      },
    });

    let localizations = [];

    for (const key in localizedVersions) {
      let pubId = publishedIds.filter(id => id.locale === key).pop();
      if (pubId) {
        localizations.push(pubId.id);
      } else {
        const latestLocVersion = _.maxBy(localizedVersions[key], (v) => v.versionNumber);
        localizations.push(latestLocVersion.id)
      }
    }


    for (const version of data.versions) {
      await strapi.db.connection.raw(
        `INSERT INTO ${model.collectionName}_versions_links VALUES (${version},${result.id})`
      );
    }

    for (const localId of localizations) {
      if (localId !== data.id) {
        await strapi.db.connection.raw(
          `INSERT INTO ${model.collectionName}_localizations_links VALUES (${localId},${result.id})`
        );
        await strapi.db.connection.raw(
          `INSERT INTO ${model.collectionName}_localizations_links VALUES (${result.id},${localId})`
        );
      }
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
