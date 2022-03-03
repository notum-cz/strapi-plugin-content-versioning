'use strict';

module.exports = [
  {
    method: 'POST',
    path: '/:slug/:itemId',
    handler: 'client.create',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/:slug',
    handler: 'client.findAllForUser',
    config: {
      policies: [],
    },
  },
  /**
  {
    method: 'PUT',
    path: '/:slug/version/:versionId',
    handler: 'client.put',
    config: {
      policies: [],
    },
  },
  {
    method: 'DELETE',
    path: '/:slug/version/:versionId',
    handler: 'client.deleteVersion',
    config: {
      policies: [],
    },
  }, */
];
