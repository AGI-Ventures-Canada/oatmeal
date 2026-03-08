// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"getting-started.mdx": () => import("../content/docs/getting-started.mdx?collection=docs"), "index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "cli/getting-started.mdx": () => import("../content/docs/cli/getting-started.mdx?collection=docs"), "cli/index.mdx": () => import("../content/docs/cli/index.mdx?collection=docs"), "guides/cli-automation.mdx": () => import("../content/docs/guides/cli-automation.mdx?collection=docs"), "guides/cli-browsing.mdx": () => import("../content/docs/guides/cli-browsing.mdx?collection=docs"), "guides/cli-judging.mdx": () => import("../content/docs/guides/cli-judging.mdx?collection=docs"), "guides/cli-organizer.mdx": () => import("../content/docs/guides/cli-organizer.mdx?collection=docs"), "guides/webhooks.mdx": () => import("../content/docs/guides/webhooks.mdx?collection=docs"), "sdk/jobs.mdx": () => import("../content/docs/sdk/jobs.mdx?collection=docs"), "sdk/schedules.mdx": () => import("../content/docs/sdk/schedules.mdx?collection=docs"), "sdk/webhooks.mdx": () => import("../content/docs/sdk/webhooks.mdx?collection=docs"), }),
};
export default browserCollections;