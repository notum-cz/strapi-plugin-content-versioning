import * as permissions from "../services/permissions";
import * as contentTypes from "../services/content-types";
import * as coreAPI from "../services/core-api";
import * as lifecycles from "../services/lifecycles";

type S = {
  permissions: typeof permissions;
  lifecycles: typeof lifecycles;
  ["content-types"]: typeof contentTypes;
  ["core-api"]: typeof coreAPI;
};

export function getService<T extends keyof S>(name: T): ReturnType<S[T]>;
