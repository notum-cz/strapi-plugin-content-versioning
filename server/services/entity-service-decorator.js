'use strict';

const { lowerCase, startCase } = require('lodash/fp');
const { getService, isLocalizedContentType } = require('../utils');

const VERSIONS_QUERY_FILTER = 'versions';

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
     * Wraps query options. For versioned models display only published/newest versions 
     * @param {object} opts - Query options object (params, data, files, populate)
     * @param {object} ctx - Query context
     * @param {object} ctx.model - Model that is being used
     */
    async wrapParams(params = {}, ctx = {}) {
        const { isVersionedContentType } = getService('content-types');
        const model = strapi.getModel(ctx.uid);

        const wrappedParams = await service.wrapParams.call(this, params, ctx);

        // Optional override with VERSIONS_QUERY_FILTER: 'all' 
        if (isVersionedContentType(model) && params[VERSIONS_QUERY_FILTER] !== 'all') {
            wrappedParams.filters = {
                $and: [{ isVisibleInListView: true }].concat(wrappedParams.filters || [])
            };
        }

        return wrappedParams;
    }
});

module.exports = () => ({
    decorator
});