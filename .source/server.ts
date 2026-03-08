// @ts-nocheck
import { frontmatter as __fd_glob_15 } from "../content/docs/sdk/webhooks.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_14 } from "../content/docs/sdk/schedules.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_13 } from "../content/docs/sdk/jobs.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_12 } from "../content/docs/guides/webhooks.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_11 } from "../content/docs/guides/cli-organizer.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_10 } from "../content/docs/guides/cli-judging.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_9 } from "../content/docs/guides/cli-browsing.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_8 } from "../content/docs/guides/cli-automation.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_7 } from "../content/docs/cli/index.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_6 } from "../content/docs/cli/getting-started.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_5 } from "../content/docs/index.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_4 } from "../content/docs/getting-started.mdx?collection=docs&only=frontmatter"
import { default as __fd_glob_3 } from "../content/docs/sdk/meta.json?collection=docs"
import { default as __fd_glob_2 } from "../content/docs/guides/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../content/docs/cli/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docsLazy("docs", "content/docs", {"meta.json": __fd_glob_0, "cli/meta.json": __fd_glob_1, "guides/meta.json": __fd_glob_2, "sdk/meta.json": __fd_glob_3, }, {"getting-started.mdx": __fd_glob_4, "index.mdx": __fd_glob_5, "cli/getting-started.mdx": __fd_glob_6, "cli/index.mdx": __fd_glob_7, "guides/cli-automation.mdx": __fd_glob_8, "guides/cli-browsing.mdx": __fd_glob_9, "guides/cli-judging.mdx": __fd_glob_10, "guides/cli-organizer.mdx": __fd_glob_11, "guides/webhooks.mdx": __fd_glob_12, "sdk/jobs.mdx": __fd_glob_13, "sdk/schedules.mdx": __fd_glob_14, "sdk/webhooks.mdx": __fd_glob_15, }, {"getting-started.mdx": () => import("../content/docs/getting-started.mdx?collection=docs"), "index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "cli/getting-started.mdx": () => import("../content/docs/cli/getting-started.mdx?collection=docs"), "cli/index.mdx": () => import("../content/docs/cli/index.mdx?collection=docs"), "guides/cli-automation.mdx": () => import("../content/docs/guides/cli-automation.mdx?collection=docs"), "guides/cli-browsing.mdx": () => import("../content/docs/guides/cli-browsing.mdx?collection=docs"), "guides/cli-judging.mdx": () => import("../content/docs/guides/cli-judging.mdx?collection=docs"), "guides/cli-organizer.mdx": () => import("../content/docs/guides/cli-organizer.mdx?collection=docs"), "guides/webhooks.mdx": () => import("../content/docs/guides/webhooks.mdx?collection=docs"), "sdk/jobs.mdx": () => import("../content/docs/sdk/jobs.mdx?collection=docs"), "sdk/schedules.mdx": () => import("../content/docs/sdk/schedules.mdx?collection=docs"), "sdk/webhooks.mdx": () => import("../content/docs/sdk/webhooks.mdx?collection=docs"), });