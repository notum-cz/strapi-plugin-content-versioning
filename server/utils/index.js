'use strict';

const pluginId = require("../pluginId");

const getCoreStore = () => {
  return strapi.store({ type: 'plugin', name: pluginId });
};

// retrieve a local service
const getService = name => {
  return strapi.plugin(pluginId).service(name);
};

// TODO: ...?
const isLocalizedContentType = (model) => {
  return strapi.plugin('i18n')?.service('content-types')?.isLocalizedContentType(model);
};

const getLatestRawQuery = (model, vuid, excludeId) => {
  const cols = ['id', 'version_number', 'published_at'];
  const orderBy = ['published_at'];
  const distinct = [];
  const where = [];

  if (isLocalizedContentType(model)) {
    cols.push('locale')
    orderBy.unshift('locale')
    distinct.unshift('locale')
  }

  if (vuid) {
    where.push(`vuid='${vuid}'`)
  } else {
    orderBy.unshift('vuid')
    distinct.unshift('vuid')
  }
  if (excludeId) {
    where.push(`id!='${excludeId}'`)
  }

  let rawQuery = distinct.length ? `SELECT DISTINCT ON (${distinct.join(',')}) ` : `SELECT `
  rawQuery += cols.join(', ') + ` FROM ${model.collectionName} `
  rawQuery += (where.length ? `WHERE ${where.join(' AND ')}` : '') + ` ORDER BY ${orderBy.join(', ')} `
  rawQuery += 'DESC NULLS LAST, version_number DESC'

  return rawQuery;
};

module.exports = {
  getService,
  getCoreStore,
  getLatestRawQuery,
  isLocalizedContentType
};
