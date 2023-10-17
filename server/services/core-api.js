"use strict";

const { v4: uuid } = require("uuid");
const _ = require("lodash");
const {
  getService,
  getLatestRawQuery,
  isLocalizedContentType,
} = require("../utils");
const { getLatestValueByDB } = require("../utils");

module.exports = {
  async createVersion(slug, data, user, options) {
    const { createNewVersion } = getService("content-types");

    const model = await strapi.getModel(slug);
    const isLocalized = isLocalizedContentType(model);
    const attrName = _.snakeCase(model.info.singularName);
    const collectionName = _.snakeCase(model.collectionName);

    const relatedEntityId = options?.plugins?.i18n?.relatedEntityId;
    if (relatedEntityId) {
      const relatedEntity = await strapi.db.query(slug).findOne({
        select: ["id", "vuid", "locale"],
        where: { id: relatedEntityId },
      });
      data.vuid = relatedEntity.vuid;
    }
    if (options?.plugins?.i18n.locale) {
      data.locale = options?.plugins?.i18n?.locale;
    }

    let hasPublishedVersion = false;
    let olderVersions = [];
    const latestByLocale = {};

    if (!data.vuid) {
      // New entity (vuid)
      data.vuid = uuid();
      data.versionNumber = 1;
      data.updatedBy = user?.id;
      data.createdBy = user?.id;
    } else {
      // New version or locale
      const where = { vuid: data.vuid };
      if (isLocalized) where.locale = data.locale;

      olderVersions = await strapi.db.query(slug).findMany({
        where,
        populate: {
          createdBy: true,
        },
      });

      const latestVersion = _.maxBy(olderVersions, (v) => v.versionNumber);
      const latestVersionNumber = latestVersion && latestVersion.versionNumber;
      data.versionNumber = (latestVersionNumber || 0) + 1;

      try {
        if (olderVersions && olderVersions.length > 0) {
          // use relatedEntity data insted of olderVers ?!
          data.createdBy = olderVersions[0].createdBy.id;
        }
      } catch (e) {
        // Fallback set logged user ID
        data.createdBy = user?.id;
      }
      data.updatedBy = user?.id;

      // Select latest(or published) for each locale
      const latestQuery = getLatestRawQuery(model, data.vuid);
      const latestInLocales = await strapi.db.connection.raw(latestQuery);

      for (const latest of getLatestValueByDB(latestInLocales)) {
        // Is version the new latest in locale?
        if (!isLocalized || data.locale == latest.locale) {
          hasPublishedVersion = !!latest.published_at;
        }
        latestByLocale[latest.locale] = latest.id;
      }
    }

    if (!data.publishedAt && hasPublishedVersion) {
      data.isVisibleInListView = false;
    } else {
      data.isVisibleInListView = true;

      const where = { vuid: data.vuid };
      if (isLocalized) where.locale = data.locale;

      await strapi.db.query(slug).updateMany({
        where,
        data: {
          isVisibleInListView: false,
          publishedAt: null,
        },
      });
    }

    data.versions = olderVersions.map((v) => v.id);

    if (isLocalized) {
      // omit current locale
      data.localizations = Object.values(_.omit(latestByLocale, data.locale));
    }

    // remove old ids
    const newData = await createNewVersion(slug, data, model);
    // Create Version
    const result = await strapi.entityService.create(slug, { data: newData });

    // Relink all versions from other locales if result is The latest(published)!
    if (result.isVisibleInListView && isLocalized) {
      // !set the current as latest in locale
      latestByLocale[result.locale] = result.id;

      const allVersionsOtherLocales = await strapi.db.query(slug).findMany({
        where: {
          vuid: result.vuid,
          locale: {
            $ne: result.locale,
          },
        },
      });

      for (const entity of allVersionsOtherLocales) {
        await strapi.db.connection.raw(
          `DELETE FROM ${collectionName}_localizations_links WHERE ${attrName}_id=${entity.id}`
        );

        const latestIds = Object.values(_.omit(latestByLocale, entity.locale));
        const sqlValues = latestIds.map(
          (latest) => `(${entity.id}, ${latest})`
        );
        if (!sqlValues?.length) continue;

        await strapi.db.connection.raw(
          `INSERT INTO ${collectionName}_localizations_links (${attrName}_id, inv_${attrName}_id) VALUES ` +
            sqlValues.join(",")
        );
      }
    }

    for (const version of olderVersions) {
      await strapi.db.connection.raw(
        `INSERT INTO ${collectionName}_versions_links (${attrName}_id, inv_${attrName}_id) VALUES (${version.id},${result.id})`
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
