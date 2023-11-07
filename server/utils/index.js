"use strict";

const { env } = require("@strapi/utils");
const pluginId = require("../pluginId");

const getCoreStore = () => {
  return strapi.store({ type: "plugin", name: pluginId });
};

// retrieve a local service
const getService = (name) => {
  return strapi.plugin(pluginId).service(name);
};

const isLocalizedContentType = (model) => {
  return strapi
    .plugin("i18n")
    ?.service("content-types")
    ?.isLocalizedContentType(model);
};

const getLatestRawQuery = (model, vuid) => {
  let rawQuery;

  if (isLocalizedContentType(model)) {
    rawQuery = `SELECT a.id, a.locale, a.version_number, a.published_at
      FROM ${model.collectionName} a WHERE NOT EXISTS (
      SELECT 1 FROM ${model.collectionName} WHERE locale=a.locale AND vuid=a.vuid AND`;
  } else {
    rawQuery = `SELECT a.id, a.version_number, a.published_at
      FROM ${model.collectionName} a WHERE NOT EXISTS (
      SELECT 1 FROM ${model.collectionName} WHERE vuid=a.vuid AND`;
  }

  rawQuery += ` (
    CASE WHEN a.published_at is null THEN (
      published_at is not null OR version_number > a.version_number
   )
   ELSE published_at is not null AND version_number > a.version_number
   END
   )
 )`;

  if (vuid) {
    rawQuery += ` AND vuid = '${vuid}'`;
  }

  return rawQuery;
};

const getLatestValueByDB = (latest) => {
  const db = env("DATABASE_CLIENT");
  switch (db) {
    case "postgres":
      return latest.rows;
    case "mysql":
      return latest[0];
    case "mysql2":
      return latest[0];
    default:
      return latest;
  }
};

module.exports = {
  getLatestValueByDB,
  getService,
  getCoreStore,
  getLatestRawQuery,
  isLocalizedContentType,
};
