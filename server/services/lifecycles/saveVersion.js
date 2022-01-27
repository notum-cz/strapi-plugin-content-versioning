"use strict";

const _ = require("lodash");
const uuid = require("uuid");
const { getService } = require("../../utils");

const saveVersion = async (slug, data) => {
  const { createNewVersion } = getService("content-types");
  const model = strapi.getModel(slug);

  // setup data, get old version and new version number
  let olderVersions = [];
  if (!data.vuid) {
    data.vuid = uuid();
    data.versionNumber = 1;
  } else {
    olderVersions = await strapi.db.query(slug).findMany({
      select: ["id", "vuid", "versionNumber"],
      where: { vuid: data.vuid },
    });
    const latestVersion = _.maxBy(olderVersions, (v) => v.versionNumber);
    const latestVersionNumber = latestVersion && latestVersion.versionNumber;
    data.versionNumber = (latestVersionNumber || 0) + 1;
  }
  data.versions = olderVersions.map((v) => v.id);

  // remove old ids
  const newData = createNewVersion(slug, data);
  const result = await strapi.entityService.create(slug, {
    data: newData,
  });
  for (const version of data.versions) {
    await strapi.db.connection.raw(
      `INSERT INTO ${model.collectionName}_versions_links VALUES (${version},${result.id})`
    );
  }
  return result;
};

module.exports = saveVersion;
