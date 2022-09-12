"use strict";

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
        locale: item.locale
      },
      data: {
        publishedAt: null,
        isVisibleInListView: true,
      },
    });
  }
};

module.exports = beforeUpdate;
