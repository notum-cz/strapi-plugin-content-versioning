'use strict';

const { has, get, omit, isArray, lowerCase, startCase } = require('lodash/fp');
const { ApplicationError } = require('@strapi/utils').errors;
const { transformParamsToQuery } = require('@strapi/utils').convertQueryParams;
const { getService, isLocalizedContentType } = require('../utils');

const VERSIONS_QUERY_FILTER = 'versions';
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

// TODO: Test query efficiency for larger datasets
const findLatestInLocale = async (model, fields) => {
    const where = ['vuid=a.vuid'];

    const mapColumnToField = {}
    const cols = fields.map((field) => {
        const dbColumn = `${startCase(field).split(' ').map(lowerCase).join('_')}`;
        mapColumnToField[dbColumn] = field;
        return 'a.' + dbColumn;
    });

    // TODO: Localizations also apply decorator which strips all except main locale entity
    //  $and: [{ locale: await getDefaultLocale() }].concat(params.filters || []),
    if (isLocalizedContentType(model)) {
        cols.push('a.locale');
        where.push('locale=a.locale');
    }
    const rawQuery = `SELECT ${cols.join(', ')} 
        FROM ${model.collectionName} a WHERE NOT EXISTS (
            SELECT 1 FROM ${model.collectionName} WHERE ${where.join(' AND ')} AND (
                CASE WHEN a.published_at is null THEN (
                    published_at is not null OR version_number > a.version_number
                )
                ELSE published_at is not null AND version_number > a.version_number
                END
            )
        )`

    const result = await strapi.db.connection.raw(rawQuery);
    if (result?.rows) {
        return result?.rows.map((row) => {
            const entity = {}
            for (const col in mapColumnToField) {
                entity[mapColumnToField[col]] = row[col] ?? null
            }
            return entity;
        })
    }
    return []
}




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

        return wrappedParams;
    },


    async findPage(uid, opts = {}) {
        const model = strapi.getModel(uid);

        const { isVersionedContentType } = getService('content-types');

        if (!isVersionedContentType(model)) {
            return service.findMany.call(this, uid, opts);
        }

        const { kind } = strapi.getModel(uid);

        const wrappedParams = await this.wrapParams(opts, { uid, action: 'findPage' });
        console.log(wrappedParams);

        if (kind === 'collectionType' && opts[VERSIONS_QUERY_FILTER] !== 'all') {
            const results = await findLatestInLocale(model, wrappedParams.fields)
            return {
                results,
                pagination: {
                    page: 1,
                    pageSize: 10,
                    pageCount: 1,
                    total: 3
                }
            };
        }


        // paggination decorate helpers!?
        const query = transformParamsToQuery(uid, wrappedParams);
        const data = strapi.db.query(uid).findMany(query);

        return data;
    }
});

module.exports = () => ({
    decorator,
    wrapParams,
});