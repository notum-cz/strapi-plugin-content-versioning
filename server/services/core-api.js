"use strict";

const { v4: uuid } = require("uuid");
const _ = require("lodash");
const { getService } = require("../utils");
const { singular } = require("pluralize");

module.exports = {
  async createVersion(slug, data, user, options) {
    const model = await strapi.getModel(slug);
    const attrName = singular(model.collectionName);

    const { createNewVersion } = getService("content-types");

    // linking to relatedEntityId will be more complex
    // do we need the 'plugins.i18n' option..?
    const relatedEntityId = options?.plugins?.i18n?.relatedEntityId
    if (options?.plugins?.i18n.locale) {
      data.locale = options?.plugins?.i18n?.locale;
    }

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
        select: ["id", "vuid", "versionNumber", "createdAt", "locale"],
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

      // Hiding other localizations if no versions are published
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

    // Relinking latest versions
    // TODO: publishing feature (export, helper for finding curren latest and/or published)
    const allLocalizations = olderVersions.flatMap((olderVersion) => {
      return olderVersion.localizations.map((item) => ({
        id: item.id,
        vuid: item.vuid,
        locale: item.locale,
      }));
    }).concat(result.localizations); // maybe not neccesary!?

    const uniqueLocalizations = _.uniqBy(allLocalizations, "vuid");
    const versionsByVuid = {};

    const allVersionsWithoutLang = (
      await strapi.db.query(slug).findMany({
        where: { vuid: { $in: uniqueLocalizations.map((item) => item.vuid) } },
        populate: {
          createdBy: true,
          localizations: true,
        },
      })
    ).map((localeVersion) => {
      if (!versionsByVuid[localeVersion.vuid]) versionsByVuid[localeVersion.vuid] = [];

      versionsByVuid[localeVersion.vuid].push({
        id: localeVersion.id,
        versionNumber: localeVersion.versionNumber,
      })

      return {
        id: localeVersion.id,
        vuid: localeVersion.vuid,
      };
    });


    for (const entity of allVersionsWithoutLang) {
      await strapi.db.connection.raw(
        `DELETE FROM ${model.collectionName}_localizations_links WHERE ${attrName}_id=${entity.id}`
      );

      // For each other locale find lastest and link it
      // TODO: create version services for handling relinking (correctly remove entity and handle published versions)
      for (const versionsVuid of Object.keys(versionsByVuid)) {
        console.log(entity.vuid, versionsVuid);
        if (entity.vuid === versionsVuid) {
          continue;
        }
        const latestInLocale = _.maxBy(versionsByVuid[versionsVuid], (v) => v.versionNumber);

        await strapi.db.connection.raw(
          `INSERT INTO ${model.collectionName}_localizations_links VALUES (${entity.id},${latestInLocale.id})`
        );
      }
      // Also link all to currently createdVersion of locale (solves multiple langs problem and first versions)
      await strapi.db.connection.raw(
        `INSERT INTO ${model.collectionName}_localizations_links VALUES (${entity.id},${result.id})`
      );
    }

    for (const version of data.versions) {
      await strapi.db.connection.raw(
        `INSERT INTO ${_.snakeCase(
          model.collectionName
        )}_versions_links (${_.snakeCase(
          model.info.singularName
        )}_id, inv_${_.snakeCase(
          model.info.singularName
        )}_id) VALUES (${version},${result.id})`
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
