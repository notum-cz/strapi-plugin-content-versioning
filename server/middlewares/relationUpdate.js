"use strict"

const { streamToBuffer } = require("@strapi/utils/lib/file");
const { getService } = require("../utils");
const _ = require("lodash");

/**
 * relation update middleware
 * @param {Ctx} ctx koa.js ctx object
 * @param {*} next next function
 * @returns 
 */
const relationUpdateMiddleware = async (ctx, next) => {
    const { model, id } = ctx.request.params
    const modelDef = strapi.getModel(model);
    if (!getService("content-types").isVersionedContentType(modelDef)) {
        console.log("It is not versioned content type");
        return next();
    }
    // console.log(strapi.contentTypes); 
    const entry = await strapi.entityService.findOne(model, id);
    console.log(entry);
    const allVersionIds = await strapi.entityService.findMany(model, { fields: ["id"], filters: { vuid: entry.vuid } });
    console.log(allVersionIds);
    if (allVersionIds.length < 2) {
        // there are no multiple version, no need to update relations
        return next();
    }
    const allVersionIdsNumbers = allVersionIds.map(id => id.id);
    //find all content types that might have relation to this content type
    // Object.entries(strapi.contentTypes).forEach(([key, item]) => console.log(item.attributes)); 
    const contentTypes = Object.entries(strapi.contentTypes);
    const components = strapi.components;
    const predicate = _.matchesProperty("type", "relation")
    const targetPredicate = _.matchesProperty("target", model)
    const matchedComponents = Object.entries(components).map(([key, item]) => {
        const result = Object.entries(item.attributes).filter(([aKey, value]) => predicate(value) && targetPredicate(value)).map(([akey, value]) => ({ name: akey, relationType: value.relation }));
        if (result.length === 0) {
            return [];
        } else {
            return {
                key: key,
                attributes: result
            }
        }
    }).flat();
    console.log("matched components", matchedComponents)
    const matchedContentTypes = contentTypes.map(([key, item]) => {

        const result = Object.entries(item.attributes).filter((([aKey, val]) => predicate(val) && targetPredicate(val) && aKey !== "localizations" && aKey !== "versions")).map(([akey, val]) => { return { name: akey, relationType: val.relation } })
        if (result.length === 0) {
            return []
        } else {
            return {
                key: key,
                attributes: result
            }
        }

    }).flat();

    const allLinkedComponents = [matchedComponents, matchedContentTypes].flat();
    console.log("matched content types", matchedContentTypes)
    //find all relations that point to one of available ids
    allLinkedComponents.forEach(async component => {
        const populateQuery = {};
        component.attributes.forEach(attr => {
            populateQuery[attr.name]= {
                filters: {
                    id: allVersionIdsNumbers
                }
            }
        })
        const filtersQuery = {};
        component.attributes.forEach(attr=> {
            filtersQuery[attr.name]= 
                allVersionIdsNumbers
            
        })
        const results = await strapi.entityService.findMany(component.key, {
            populate: populateQuery,
            filters: filtersQuery
        })
        console.log("results"+component.key, results); 
        results.forEach(async result => {
            await strapi.entityService.update(component.key, result.id, {data: {
                ...generateUpdateData(result, component.attributes, id, allVersionIdsNumbers)
            }})
        })
    })

    //update all content types to the latest published version

    strapi.log.http("Relation update middleware")
    return next();
}

function generateUpdateData(result, attributes, id, allIds) {
    const updateData = {}; 
    attributes.forEach(attr => {
        let resultAttribute = result[attr.name]; 
        if(typeof resultAttribute === "object"){
            updateData[attr.name] = {
                disconnect: [resultAttribute.id],
                connect: [id]
            }
        } else if(Array.isArray(resultAttribute)){
            updateData[attr.name] = {
                disconnect: resultAttribute.map(resu => resu.id).filter(resultId => resultId !== id).filter(resultId => allIds.includes(resultId)),
                connect: [id]
            }
        }
    })
    return updateData; 
}

module.exports = {
    relationUpdateMiddleware
}