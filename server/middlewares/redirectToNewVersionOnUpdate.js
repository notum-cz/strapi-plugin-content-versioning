const redirectToNewVersionOnUpdate = async (ctx, next) => {
  ctx.set("location", "/settings");
  ctx.status = 307;
  return next();
};
module.exports = redirectToNewVersionOnUpdate;
