"use strict";
//@ts-check

const _ = require("lodash");

const { getService } = require("./utils");

const enableContentType = require("./migrations/content-type/enable");
const disableContentType = require("./migrations/content-type/disable");
const { relationUpdateMiddleware } = require("./middlewares");

module.exports = ({ strapi }) => {
  extendVersionedContentTypes(strapi);
  addStrapiVersioningMiddleware(strapi);
  addContentTypeSyncHooks(strapi);
};

/**
 * Adds hooks to migration content types versions on enable/disable of versioning
 * @param {Strapi} strapi
 */
const addContentTypeSyncHooks = (strapi) => {
  strapi.hook("strapi::content-types.beforeSync").register(disableContentType);
  strapi.hook("strapi::content-types.afterSync").register(enableContentType);
};

/**
 * Adds version fields to versioned content types
 * @param {Strapi} strapi
 */
const extendVersionedContentTypes = (strapi) => {
  const contentTypeService = getService("content-types");

  Object.values(strapi.contentTypes).forEach((contentType) => {
    if (contentTypeService.isVersionedContentType(contentType)) {
      const { attributes } = contentType;

      _.set(attributes, "versions", {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: "relation",
        relation: "manyToMany",
        target: contentType.uid,
      });

      _.set(attributes, "vuid", {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: "string",
      });

      _.set(attributes, "versionNumber", {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: "integer",
        default: 1,
      });

      _.set(attributes, "versionComment", {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: "string",
      });

      _.set(attributes, "isVisibleInListView", {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: "boolean",
        default: true,
      });
    }
  });
};

/**
 * Adds middlewares on CM publish routes
 * @param {Strapi} strapi
 */
const addStrapiVersioningMiddleware = (strapi) => {
  strapi.server.router.use(
    "/content-manager/collection-types/:model/:id/actions/publish",
    (ctx, next) => {
      if (ctx.method === "POST") {
        return relationUpdateMiddleware(ctx, next);
      }

      return next();
    }
  );

  strapi.server.router.use(
    "/content-manager/collection-types/:model/:id",
    (ctx, next) => {
      if (ctx.method === "PUT") {
        return relationUpdateMiddleware(ctx, next);
      }

      return next();
    }
  );
};
