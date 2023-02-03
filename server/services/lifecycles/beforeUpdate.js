"use strict";
const _ = require("lodash");

const beforeUpdate = async (event) => {
  const { params } = event;
  const { data, where } = params;
  const attrName = _.snakeCase(event.model.singularName)
  const collectionName = event.model.tableName

  if (data?.publishedAt) {
    const item = await strapi.db.query(event.model.uid).findOne({ where });

    await strapi.db.query(event.model.uid).update({
      where: {
        id: item.id,
      },
      data: {
        isVisibleInListView: true,
      },
    });

    await strapi.db.query(event.model.uid).updateMany({
      where: {
        vuid: item.vuid,
        locale: item.locale,
        id: {
          $ne: item.id,
        }
      },
      data: {
        publishedAt: null, // not when creating
        isVisibleInListView: false,
      },
    });

    // Relink logic 
    const latestInLocales = (await strapi.db.connection.raw(
      `SELECT DISTINCT ON (locale) id, locale, version_number, published_at FROM ${collectionName}
      WHERE vuid='${item.vuid}'
      ORDER BY locale, published_at DESC NULLS LAST, version_number DESC`
    ))
    const latestByLocale = {};
    for (const latest of latestInLocales.rows) {
      latestByLocale[latest.locale] = latest.id
    }

    // !set the current as latest in locale
    latestByLocale[item.locale] = item.id

    const allVersionsOtherLocales = (
      await strapi.db.query(event.model.uid).findMany({
        where: {
          vuid: item.vuid,
          locale: {
            $ne: item.locale,
          }
        },
      })
    )

    for (const entity of allVersionsOtherLocales) {
      await strapi.db.connection.raw(
        `DELETE FROM ${collectionName}_localizations_links WHERE ${attrName}_id=${entity.id}`
      );

      const latestIds = Object.values(_.omit(latestByLocale, entity.locale))
      const sqlValues = latestIds.map((latest) => `(${entity.id}, ${latest})`)
      if (!sqlValues?.length) continue;

      await strapi.db.connection.raw(
        `INSERT INTO ${collectionName}_localizations_links (${attrName}_id, inv_${attrName}_id) VALUES ` + sqlValues.join(",")
      );
    }

  }
};

module.exports = beforeUpdate;
