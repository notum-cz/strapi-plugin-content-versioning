import { has, get, omit } from "lodash";

const versionedPath = ["pluginOptions", "versions", "versioned"];

const mutateCTBContentTypeSchema = (nextSchema, prevSchema) => {
  // Don't perform mutations components
  if (!has(nextSchema, versionedPath)) {
    return nextSchema;
  }

  const isNextSchemaVersioned = get(nextSchema, versionedPath, false);
  const isPrevSchemaVersioned = get(
    prevSchema,
    ["schema", ...versionedPath],
    false
  );

  // No need to perform modification on the schema, if versions feature was not changed
  // at the ct level
  if (isNextSchemaVersioned && isPrevSchemaVersioned) {
    return nextSchema;
  }

  // Remove versions object from the pluginOptions
  if (!isNextSchemaVersioned) {
    const pluginOptions = omit(nextSchema.pluginOptions, "versions");

    return { ...nextSchema, pluginOptions };
  }

  return nextSchema;
};
export default mutateCTBContentTypeSchema;
