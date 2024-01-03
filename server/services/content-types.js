"use strict";

const {
  pick,
  pipe,
  has,
  prop,
  isNil,
  cloneDeep,
  isArray,
} = require("lodash/fp");

const { get, set, forEach, pickBy } = require("lodash");

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

  forEach(model.attributes, (attr, attrName) => {
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

const generatePopulateStatement = (relations) => {
  const result = {};

  relations.forEach((item) => {
    if (typeof item === "object" && !Array.isArray(item)) {
      const key = Object.keys(item)[0];
      const innerObj = {};

      item[key].forEach((innerItem) => {
        if (typeof innerItem === "object") {
          const key = Object.keys(innerItem)[0];
          innerObj[key] = {
            populate: {},
          };
          innerItem[key].forEach((element) => {
            innerObj[key]["populate"][element] = true;
          });
        } else {
          innerObj[innerItem] = true;
        }
      });

      result[key] = { populate: innerObj };
    } else if (Array.isArray(item)) {
      const key = Object.keys(item)[0];
      const innerObj = {};

      item[key].forEach((innerItem) => {
        innerObj[innerItem] = true;
      });

      result[key] = { populate: innerObj };
    } else {
      result[item] = true;
    }
  });

  return result;
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
    if (attributes[key].type === "component") {
      const model = strapi.getModel(attributes[key].component);
      const relations = getUpdatableRelations(model);
      relations && result.push({ [key]: relations });
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

  const updateRelations = (updatableRels, parent) => {
    console.log("prevV", previousVersion, get(previousVersion, "dz"));
    const previous = get(previousVersion, parent, previousVersion);
    console.log(
      "previous",
      previous,
      "parent",
      parent,
      "upd reles",
      updatableRelations
    );
    updatableRels.forEach((relation) => {
      if (typeof relation === "string") {
        if (previous) {
          if (!isArray(previous)) {
            const prevRel = previous[relation] ?? undefined;
            if (prevRel) {
              const newDataRel = parent
                ? get(newData, `${parent}.${relation}`, newData[relation])
                : newData[relation];
              const mergedConnects = mergeConnections(newDataRel, prevRel);

              if (!get(connects, parent)) {
                set(connects, parent, [
                  {
                    ...get(newData, parent),
                    ...pickBy(previous),
                  },
                ]);
              }
              if (!parent) {
                connects[relation] = { connect: mergedConnects };
                return;
              }
              set(connects, `${parent}.${relation}`, {
                connect: mergedConnects,
              });
            }
            return;
          }

          previous.forEach((prev, i) => {
            const prevRel = prev[relation] ?? undefined;

            if (prevRel) {
              const newDataRel = get(
                newData,
                `${parent}.${i}.${relation}`,
                newData[relation]
              );
              const mergedConnects = mergeConnections(newDataRel, prevRel);

              if (!get(connects, parent)) {
                set(connects, parent, [
                  {
                    ...get(newData, `${parent}[${i}]`),
                    ...pickBy(previous[i]),
                  },
                ]);
              }
              set(connects, `${parent}.${i}.${relation}`, {
                connect: mergedConnects,
              });
            }
          });
        }

        return;
      }

      Object.keys(relation).map((key) => {
        if (Array.isArray(relation[key])) {
          return updateRelations(
            relation[key],
            `${parent ? parent + "." : ""}${key}`
          );
        }
      });
    });
  };
  const connects = {};
  updateRelations(updatableRelations);
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
