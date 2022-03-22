"use strict";

const { getService } = require("./utils");

module.exports = async ({ strapi }) => {
  // const { actions } = strapi.plugin(pluginId).service("permissions");
  const { actions } = getService("permissions");

  strapi.server.router.use(
    "/content-manager/collection-types/:model",
    (ctx, next) => {
      if (ctx.method === "GET") {
        const { model } = ctx.params;
        const modelDef = strapi.getModel(model);

        if (!getService("content-types").isVersionedContentType(modelDef)) {
          return next();
        }

        ctx.request.query.filters = {
          $and: [{ is_visible_in_list_view: { $eq: true } }],
          ...ctx.request.query.filters,
        };
      }

      if (ctx.method === "POST") {
        delete ctx.request.body.vuid;
        delete ctx.request.body.versionNumber;
        delete ctx.request.body.versions;
      }

      return next();
    }
  );

  // Actions
  await actions.registerVersionsActions();

  // Hooks & Models
  registerModelsHooks();
};

const registerModelsHooks = () => {
  const versionedModelUIDs = Object.values(strapi.contentTypes)
    .filter((contentType) =>
      getService("content-types").isVersionedContentType(contentType)
    )
    .map((contentType) => contentType.uid);

  if (versionedModelUIDs.length > 0) {
    strapi.db.lifecycles.subscribe({
      models: versionedModelUIDs,
      async beforeCreate(event) {
        getService("lifecycles").beforeCreate(event);
      },
      async beforeUpdate(event) {
        await getService("lifecycles").beforeUpdate(event);
      },
    });
  }
};
