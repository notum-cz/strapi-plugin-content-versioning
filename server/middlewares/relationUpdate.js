"use strict";

const { getService } = require("../utils");
const _ = require("lodash");

/**
 * relation update middleware
 * @param {Ctx} ctx koa.js ctx object
 * @param {*} next next function
 * @returns
 */
const relationUpdateMiddleware = async (ctx, next) => {
  const { model, id } = ctx.request.params;
  const modelDef = strapi.getModel(model);
  if (
    !getService("content-types").isVersionedContentType(modelDef) ||
    modelDef.__schema__.kind === "singleType"
  ) {
    return next();
  }
  // console.log(strapi.contentTypes);
  const entry = await strapi.entityService.findOne(model, id);
  console.log(entry);
  const allVersionIds = await strapi.db.query(model).findMany({
    select: ["id"],
    where: {
      vuid: entry.vuid,
    },
  });
  console.log(allVersionIds);
  const allVersionIdsNumbers = allVersionIds.map((id) => id.id);
  if (allVersionIdsNumbers.length < 2) {
    // there are no multiple version, no need to update relations
    return next();
  }
  //find all content types that might have relation to this content type
  const contentTypes = Object.entries(strapi.contentTypes);
  const components = strapi.components;
  const matchedComponents = Object.entries(components)
    .map(mappingFn(model))
    .flat();
  const matchedContentTypes = contentTypes
    .map(
      mappingFn(
        model,
        ({ name }) => name !== "localizations" && name !== "versions"
      )
    )
    .flat();

  console.log(matchedComponents, matchedContentTypes);

  const allLinkedComponents = [matchedComponents, matchedContentTypes].flat();
  //find all relations that point to one of available ids
  allLinkedComponents.forEach(findAndUpdateRelations(allVersionIdsNumbers, id));
  return next();
};

function findAndUpdateRelations(allVersionIdsNumbers, id) {
  console.log(allVersionIdsNumbers, id);
  return async (component) => {
    const populateQuery = {};
    const filtersQuery = {};
    component.attributes.forEach((attr) => {
      populateQuery[attr.name] = {
        filters: {
          id: allVersionIdsNumbers,
        },
      };
      filtersQuery[attr.name] = allVersionIdsNumbers;
    });
    const results = await strapi.query(component.key).findMany({
      populate: populateQuery,
      filters: filtersQuery,
    });
    console.log(filtersQuery);
    //update all content types to the latest published version
    results.forEach(async (result) => {
      console.log(
        component.key,
        result.id,
        generateUpdateData(
          result,
          component.attributes,
          parseInt(id),
          allVersionIdsNumbers
        )
      );
      await strapi.db.query(component.key).update({
        where: {
          id: result.id,
        },
        data: generateUpdateData(
          result,
          component.attributes,
          parseInt(id),
          allVersionIdsNumbers
        ),
      });
    });
  };
}

function mappingFn(model, additionalPredicate) {
  const predicate = _.matchesProperty("type", "relation");
  const targetPredicate = _.matchesProperty("target", model);
  return ([key, item]) => {
    let result = Object.entries(item.attributes)
      .filter(([aKey, value]) => predicate(value) && targetPredicate(value))
      .map(([akey, value]) => ({ name: akey, relationType: value.relation }));
    if (typeof additionalPredicate === "function") {
      result = result.filter(additionalPredicate);
    }
    if (result.length === 0) {
      return [];
    } else {
      return {
        key: key,
        attributes: result,
      };
    }
  };
}

function generateUpdateData(result, attributes, id, allIds) {
  const updateData = {};
  attributes.forEach((attr) => {
    let resultAttribute = result[attr.name];
    if (typeof resultAttribute === "object") {
      updateData[attr.name] = {
        disconnect: [resultAttribute.id],
        connect: [id],
      };
    } else if (Array.isArray(resultAttribute)) {
      updateData[attr.name] = {
        disconnect: resultAttribute
          .map((resu) => resu.id)
          .filter((resultId) => resultId !== id)
          .filter((resultId) => allIds.includes(resultId)),
        connect: [id],
      };
    }
  });
  return updateData;
}

module.exports = {
  relationUpdateMiddleware,
};
