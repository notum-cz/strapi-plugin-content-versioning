"use strict";

// const saveVersion = require("./saveVersion");

const beforeUpdate = async (event) => {
  const { params } = event;
  const { data, where } = params;

  if (data.publishedAt) {
    const item = await strapi.db.query(event.model.uid).findOne({ where });

    await strapi.db.query(event.model.uid).update({
      where: {
        id: item.id,
      },
      data: {
        isVisibleInListView: true,
      },
    });

    await strapi.db.query(event.model.uid).updateMany({
      where: {
        vuid: item.vuid,
        id: {
          $ne: item.id,
        },
      },
      data: {
        publishedAt: null,
        isVisibleInListView: false,
      },
    });
  }
  //   const versionNumber = data && data.versionNumber;
  //   if (versionNumber) {
  //     await saveVersion(event.model.uid, {
  //       ...data,
  //       id: params.where.id,
  //     });
  //     event.params.data = { versionNumber };
  //   }
};

module.exports = beforeUpdate;
