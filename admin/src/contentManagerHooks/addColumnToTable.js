import React from 'react';
import get from 'lodash/get';

const addColumnToTableHook = ({ displayedHeaders, layout }) => {
  const isVersioned = get(layout, 'contentType.pluginOptions.versions.versioned', false);

  if (!isVersioned) {
    return { displayedHeaders, layout };
  }

  return {
    displayedHeaders: [
      ...displayedHeaders,
      {
        key: '__version_key__',
        fieldSchema: { type: 'integer' },
        metadatas: { label: 'Version', searchable: true, sortable: true },
        name: 'versionNumber',
        cellFormatter: props => props.versionNumber,
      },
    ],
    layout,
  };
};

export default addColumnToTableHook;
