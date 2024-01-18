"use strict";

const _ = require("lodash");
const {
  pick,
  pipe,
  has,
  prop,
  isNil,
  cloneDeep,
  isArray,
} = require("lodash/fp");
const get = require("lodash/get");
const {
  isRelationalAttribute,
  getVisibleAttributes,
  isMediaAttribute,
  isTypedAttribute,
} = require("@strapi/utils").contentTypes;

const hasVersionedOption = (modelOrAttribute) => {
  return prop("pluginOptions.versions.versioned", modelOrAttribute) === true;
};

/**
 * Returns whether an attribute is versioned or not
 * @param {*} attribute
 * @returns
 */
const isVersionedAttribute = (model, attributeName) => {
  const attribute = model.attributes[attributeName];

  return (
    hasVersionedOption(attribute) ||
    (isRelationalAttribute(attribute) && !isMediaAttribute(attribute)) ||
    isTypedAttribute(attribute, "uid")
  );
};

/**
 * Returns whether a model is versioned or not
 * @param {*} model
 * @returns
 */
const isVersionedContentType = (model) => {
  return hasVersionedOption(model);
};

/**
 * Returns the list of attribute names that are not versioned
 * @param {object} model
 * @returns {string[]}
 */
const getNonVersionedAttributes = (model) => {
  return getVisibleAttributes(model).filter(
    (attributeName) => !isVersionedAttribute(model, attributeName)
  );
};

const removeId = (value) => {
  if (typeof value === "object" && (has("id", value) || has("_id", value))) {
    delete value.id;
    delete value._id;
  }
};

const removeIds = (model) => (entry) => removeIdsMut(model, cloneDeep(entry));

const removeIdsMut = (model, entry) => {
  if (isNil(entry)) {
    return entry;
  }

  removeId(entry);

  _.forEach(model.attributes, (attr, attrName) => {
    const value = entry[attrName];
    if (attr.type === "dynamiczone" && isArray(value)) {
      value.forEach((compo) => {
        if (has("__component", compo)) {
          const model = strapi.components[compo.__component];
          removeIdsMut(model, compo);
        }
      });
    } else if (attr.type === "component") {
      const model = strapi.components[attr.component];
      if (isArray(value)) {
        value.forEach((compo) => removeIdsMut(model, compo));
      } else {
        removeIdsMut(model, value);
      }
    } else if (attr.type === "relation") {
      if (value) {
        entry[attrName] = isArray(value)
          ? value.map((r) => get(r, "id", r))
          : get(value, "id", value);
      }
    }
  });

  return entry;
};

/**
 * Returns a copy of an entry picking only its non versioned attributes
 * @param {object} model
 * @param {object} entry
 * @returns {object}
 */
const copyNonVersionedAttributes = (model, entry) => {
  const nonVersionedAttributes = getNonVersionedAttributes(model);

  return pipe(pick(nonVersionedAttributes), removeIds(model))(entry);
};

/**
 * Returns the list of attribute names that are versioned
 * @param {object} model
 * @returns {string[]}
 */
const getVersionedAttributes = (model) => {
  return getVisibleAttributes(model).filter((attributeName) =>
    isVersionedAttribute(model, attributeName)
  );
};

const reduceArray = (arrayOfObjects) => {
  const resultMap = {};
  const resultArray = [];

  arrayOfObjects.forEach((obj) => {
    if (typeof obj === "string") {
      resultArray.push(obj);
      return;
    }
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        if (!resultMap[key]) {
          resultMap[key] = [...new Set(obj[key])];
        } else {
          resultMap[key] = [...new Set([...resultMap[key], ...obj[key]])];
        }
      } else {
        resultMap[key] = obj[key];
      }
    }
  });

  for (const key in resultMap) {
    resultArray.push({ [key]: resultMap[key] });
  }

  return resultArray;
};

const generatePopulateStatement = (updateableRelations) => {
  const output = {};
  if (_.isArray(updateableRelations)) {
    updateableRelations.forEach((relation, i) => {
      if (typeof relation === "string") _.set(output, relation, true);
      if (typeof relation === "object")
        Object.keys(relation).forEach((rel) => {
          _.set(
            output,
            rel,
            _.isEmpty(updateableRelations[i][rel])
              ? true
              : {
                  populate: generatePopulateStatement(
                    updateableRelations[i][rel]
                  ),
                }
          );
        });
    });
  } else if (typeof updateableRelations === "object") {
    Object.keys(updateableRelations).forEach((relation) => {
      _.set(output, relation, {
        populate: generatePopulateStatement(updateableRelations[relation]),
      });
    });
  }

  return output;
};

const getUpdatableRelations = (model) => {
  const result = [];
  const attributes = model?.attributes ?? [];

  for (const key in attributes) {
    if (
      attributes[key].type === "relation" &&
      attributes[key].target.startsWith("api::") &&
      key !== "versions" &&
      key !== "localizations"
    ) {
      result.push(key);
    }

    if (attributes[key].type === "dynamiczone") {
      for (const comp of attributes[key].components) {
        const model = strapi.getModel(comp);
        const relations = getUpdatableRelations(model);
        relations && result.push({ [key]: relations });
      }
    }
  }

  return result;
};

const manageRelations = async (newData, uid, oldVersionId, model) => {
  if (!oldVersionId) {
    return newData;
  }

  const updatableRelations = reduceArray(getUpdatableRelations(model));

  const previousVersion = await strapi.db.query(uid).findOne({
    where: {
      id: oldVersionId,
    },
    populate: generatePopulateStatement(updatableRelations),
  });

  const mergeConnections = (newDataRel, prevRel) => {
    const newDataConnects = newDataRel.connect;
    const newDataDisconnects = newDataRel.disconnect;

    //Connect relations from previous version but only if they were not changed by user in the current version.
    const idsHandledByEditor = [
      ...newDataConnects.map((conn) => conn.id),
      ...newDataDisconnects.map((conn) => conn.id),
    ];

    const mergedConnects = [...newDataConnects];

    const prevRelIds = Array.isArray(prevRel)
      ? prevRel.map((rel) => rel.id)
      : [prevRel.id];
    prevRelIds.forEach((pid) => {
      if (!idsHandledByEditor.includes(pid)) {
        mergedConnects.push({ id: pid });
      }
    });

    return mergedConnects;
  };

  const updateRelations = (updateableRels, previous, parent = null) => {
    updateableRels.forEach((relation) => {
      if (typeof relation === "string") {
        if (previous) {
          if (!_.isArray(previous)) {
            const prevRel = previous[relation] ?? undefined;

            if (prevRel) {
              const newDataRel = parent
                ? newData[parent][relation]
                : newData[relation];

              const mergedConnects = mergeConnections(newDataRel, prevRel);

              if (!connects[parent]) {
                connects[parent] = [
                  {
                    ...newData[parent],
                    ..._.pickBy(previousVersion[parent]),
                  },
                ];
              }
              if (!parent) {
                connects[relation] = { connect: mergedConnects };
                return;
              }
              connects[parent][relation] = { connect: mergedConnects };
            }
            return;
          }

          previous.forEach((prev, i) => {
            const prevRel = prev[relation] ?? undefined;

            if (prevRel) {
              const newDataRel = newData[parent][i][relation];
              const mergedConnects = mergeConnections(newDataRel, prevRel);

              if (!connects[parent]) {
                connects[parent] = [
                  {
                    ...newData[parent][i],
                    ..._.pickBy(previousVersion[parent][i]),
                  },
                ];
              }
              connects[parent][i][relation] = { connect: mergedConnects };
            }
          });
        }

        return;
      }
      Object.keys(relation).map((key) => {
        if (Array.isArray(relation[key])) {
          return updateRelations(relation[key], previous[key], key);
        }
      });
    });
  };
  const connects = {};
  updateRelations(updatableRelations, previousVersion);

  return {
    ...newData,
    ...connects,
  };
};

const createNewVersion = async (modelUid, oldVersion, model) => {
  const modelDef = strapi.getModel(modelUid);
  // Remove timestamps
  ["createdAt", "updatedAt", "publishedAt"].forEach((ts) => {
    if (oldVersion[ts]) {
      delete oldVersion[ts];
    }
  });

  return await manageRelations(
    removeIds(modelDef)(oldVersion),
    modelUid,
    oldVersion.id,
    model
  );
};

module.exports = () => ({
  isVersionedContentType,
  createNewVersion,
  getVersionedAttributes,
  getNonVersionedAttributes,
  copyNonVersionedAttributes,
});
