'use strict';

module.exports = [
  {
    method: 'POST',
    path: '/:slug/:postId',
    handler: 'client.post',
    config: {
      policies: [],
    },
  },
  /**
  {
    method: 'GET',
    path: '/:slug',
    handler: 'client.findAllVersions',
    config: {
      policies: [],
    },
  },
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
