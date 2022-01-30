const actions = [
  {
    section: "plugins",
    displayName: "Save version",
    uid: "save",
    pluginName: "content-versioning",
  },
];

const registerVersionsActions = async () => {
  const { actionProvider } = strapi.admin.services.permission;

  await actionProvider.registerMany(actions);
};

module.exports = {
  registerVersionsActions,
};
