// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"getting-started.mdx": () => import("../content/docs/getting-started.mdx?collection=docs"), "index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "guides/agent-management.mdx": () => import("../content/docs/guides/agent-management.mdx?collection=docs"), "guides/document-processing.mdx": () => import("../content/docs/guides/document-processing.mdx?collection=docs"), "guides/scheduled-reports.mdx": () => import("../content/docs/guides/scheduled-reports.mdx?collection=docs"), "guides/webhooks.mdx": () => import("../content/docs/guides/webhooks.mdx?collection=docs"), "sdk/agents.mdx": () => import("../content/docs/sdk/agents.mdx?collection=docs"), "sdk/jobs.mdx": () => import("../content/docs/sdk/jobs.mdx?collection=docs"), }),
};
export default browserCollections;