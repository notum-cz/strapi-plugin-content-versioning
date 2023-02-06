'use strict';

const { has, get, omit, isArray } = require('lodash/fp');
const { ApplicationError } = require('@strapi/utils').errors;
const { transformParamsToQuery } = require('@strapi/utils').convertQueryParams;
const { getService } = require('../utils');

const LOCALE_QUERY_FILTER = 'locale';
const SINGLE_ENTRY_ACTIONS = ['findOne', 'update', 'delete'];
const BULK_ACTIONS = ['delete'];

const paramsContain = (key, params) => {
    return (
        has(key, params.filters) ||
        (isArray(params.filters) && params.filters.some((clause) => has(key, clause))) ||
        (isArray(get('$and', params.filters)) && params.filters.$and.some((clause) => has(key, clause)))
    );
};

/**
 * Adds default locale or replaces locale by locale in query params
 * @param {object} params - query params
 * @param {object} ctx
 */
const wrapParams = async (params = {}, ctx = {}) => {
    const { action } = ctx;

    if (has(LOCALE_QUERY_FILTER, params)) {
        if (params[LOCALE_QUERY_FILTER] === 'all') {
            return omit(LOCALE_QUERY_FILTER, params);
        }

        return {
            ...omit(LOCALE_QUERY_FILTER, params),
            filters: {
                $and: [{ locale: params[LOCALE_QUERY_FILTER] }].concat(params.filters || []),
            },
        };
    }

    const entityDefinedById = paramsContain('id', params) && SINGLE_ENTRY_ACTIONS.includes(action);
    const entitiesDefinedByIds = paramsContain('id.$in', params) && BULK_ACTIONS.includes(action);

    if (entityDefinedById || entitiesDefinedByIds) {
        return params;
    }

    const { getDefaultLocale } = getService('locales');

    return {
        ...params,
        filters: {
            $and: [{ locale: await getDefaultLocale() }].concat(params.filters || []),
        },
    };
};


const findLatestInLocale = (await strapi.db.connection.raw(
    `SELECT DISTINCT ON (locale) id, locale, version_number, published_at FROM ${collectionName}
      WHERE vuid='${item.vuid}' AND id!='${item.id}' 
      ORDER BY locale, published_at DESC NULLS LAST, version_number DESC`
  ))


/**
 * Decorates the entity service with Content Versioning logic
 * As decorator API passes into official Strapi support, could move most logic here
 * @param {object} service - entity service
 */
const decorator = (service) => ({
    /**
     * Wraps query options. In particular will add default locale to query params
     * @param {object} opts - Query options object (params, data, files, populate)
     * @param {object} ctx - Query context
     * @param {object} ctx.model - Model that is being used
     */
    async wrapParams(params = {}, ctx = {}) {
        const wrappedParams = await service.wrapParams.call(this, params, ctx);

        const model = strapi.getModel(ctx.uid);

        const { isLocalizedContentType } = getService('content-types');

        if (!isLocalizedContentType(model)) {
            return wrappedParams;
        }

        return wrapParams(params, ctx);
    },


    /**
     * Find an entry or several if fetching all locales
     * @param {string} uid - Model uid
     * @param {object} opts - Query options object (params, data, files, populate)
     */
    async findMany(uid, opts = {}) {
        const model = strapi.getModel(uid);

        const { isVersionedContentType } = getService('content-types');

        if (!isVersionedContentType(model)) {
            return service.findMany.call(this, uid, opts);
        }

        const { kind } = strapi.getModel(uid);
        console.log({kind});

        const wrappedParams = await this.wrapParams(opts, { uid, action: 'findMany' });

        const query = transformParamsToQuery(uid, wrappedParams);

        if (kind === 'singleType') {
            if (opts[LOCALE_QUERY_FILTER] === 'all') {
                return strapi.db.query(uid).findMany(query);
            }
            return strapi.db.query(uid).findOne(query);
        }

        return strapi.db.query(uid).findMany(query);
    },
});

module.exports = () => ({
    decorator,
    wrapParams,
});