"use strict";

module.exports = [
  {
    method: "POST",
    path: `/:slug/save`,
    handler: "versions.save",
    config: {
      policies: [
        "admin::isAuthenticatedAdmin",
        {
          name: "admin::hasPermissions",
          config: {
            actions: ["plugin::content-versioning.save"],
          },
        },
      ],
    },
  },
];
