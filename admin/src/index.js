import * as yup from "yup";
import { prefixPluginTranslations } from "@strapi/helper-plugin";
import pluginPkg from "../../package.json";
import pluginId from "./pluginId";
import Initializer from "./components/Initializer";
import middlewares from "./middlewares";
import Versions from "./components/Versions";
import CheckboxConfirmation from "./components/CheckboxConfirmation";
import mutateCTBContentTypeSchema from "./utils/mutateCTBContentTypeSchema";
import { getTrad } from "./utils";
import addColumnToTableHook from "./contentManagerHooks/addColumnToTable";

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addMiddlewares(middlewares);

    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    });
  },

  bootstrap(app) {
    app.injectContentManagerComponent("editView", "right-links", {
      name: "Versions",
      Component: Versions,
    });

   

    // Hook that adds a column into the CM's LV table
    app.registerHook(
      "Admin/CM/pages/ListView/inject-column-in-table",
      addColumnToTableHook
    );

    const ctbPlugin = app.getPlugin("content-type-builder");

    if (ctbPlugin) {
      const ctbFormsAPI = ctbPlugin.apis.forms;
      ctbFormsAPI.addContentTypeSchemaMutation(mutateCTBContentTypeSchema);
      ctbFormsAPI.components.add({
        id: "checkboxConfirmation",
        component: CheckboxConfirmation,
      });

      ctbFormsAPI.extendContentType({
        validator: () => ({
          versions: yup.object().shape({
            versioned: yup.bool(),
          }),
        }),
        form: {
          advanced() {
            return [
              {
                name: "pluginOptions.versions.versioned",
                description: {
                  id: getTrad(
                    "plugin.schema.versions.versioned.description-content-type"
                  ),
                  defaultMessage: "Allow you to keep older versions of content",
                },
                type: "checkboxConfirmation",
                intlLabel: {
                  id: getTrad(
                    "plugin.schema.versions.versioned.label-content-type"
                  ),
                  defaultMessage: "Enable versioning for this Content-Type",
                },
              },
            ];
          },
        },
      });
    }
  },
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      })
    );

    return Promise.resolve(importedTrads);
  },
};
