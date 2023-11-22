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

const getUpdatableRelations = (model) => {
  const result = [];
  const attributes = model.attributes;
  for (const key in attributes) {
    if (
      attributes[key].type === "relation" &&
      attributes[key].target.startsWith("api::") &&
      key !== "versions" &&
      key !== "localizations"
    ) {
      result.push(key);
    }
  }

  return result;
};

const manageRelations = async (newData, uid, oldVersionId, model) => {
  if (!oldVersionId) {
    return newData;
  }

  const updatableRelations = getUpdatableRelations(model);
  const previousVersion = await strapi.db.query(uid).findOne({
    where: {
      id: oldVersionId,
    },
    populate: updatableRelations,
  });
  const connects = {};
  updatableRelations.forEach((rel) => {
    const prevRel = previousVersion[rel];
    if (prevRel) {
      const newDataRel = newData[rel];
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
          mergedConnects.push(pid);
        }
      });

      connects[rel] = { connect: mergedConnects };
    }
  });
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
