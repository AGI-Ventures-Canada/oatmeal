// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "sdk/agents.mdx": () => import("../content/docs/sdk/agents.mdx?collection=docs"), "sdk/getting-started.mdx": () => import("../content/docs/sdk/getting-started.mdx?collection=docs"), "sdk/index.mdx": () => import("../content/docs/sdk/index.mdx?collection=docs"), "sdk/jobs.mdx": () => import("../content/docs/sdk/jobs.mdx?collection=docs"), }),
};
export default browserCollections;