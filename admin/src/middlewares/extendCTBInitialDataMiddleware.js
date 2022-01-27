import { has } from 'lodash';

const extendCTBInitialDataMiddleware = () => {
  return () => next => action => {
    if (
      action.type === 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT' &&
      action.modalType === 'contentType'
    ) {
      const versions = { versioned: false };

      const pluginOptions = action.data.pluginOptions
        ? { ...action.data.pluginOptions, versions }
        : { versions };

      const data = { ...action.data, pluginOptions };

      if (action.actionType === 'create') {
        return next({ ...action, data });
      }

      // Override the action if the pluginOption config does not contain versioning
      // In this case we need to set the proper initialData shape
      if (!has(action.data.pluginOptions, 'versions.versioned')) {
        return next({ ...action, data });
      }
    }

    // action is not the one we want to override
    return next(action);
  };
};

export default extendCTBInitialDataMiddleware;
