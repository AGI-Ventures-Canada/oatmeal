// @ts-nocheck
import { frontmatter as __fd_glob_12 } from "../content/docs/sdk/jobs.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_11 } from "../content/docs/sdk/agents.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_10 } from "../content/docs/guides/webhooks.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_9 } from "../content/docs/guides/scheduled-reports.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_8 } from "../content/docs/guides/sandbox-execution.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_7 } from "../content/docs/guides/hackathon-judging.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_6 } from "../content/docs/guides/document-processing.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_5 } from "../content/docs/guides/agent-management.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_4 } from "../content/docs/index.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_3 } from "../content/docs/getting-started.mdx?collection=docs&only=frontmatter"
import { default as __fd_glob_2 } from "../content/docs/sdk/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../content/docs/guides/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docsLazy("docs", "content/docs", {"meta.json": __fd_glob_0, "guides/meta.json": __fd_glob_1, "sdk/meta.json": __fd_glob_2, }, {"getting-started.mdx": __fd_glob_3, "index.mdx": __fd_glob_4, "guides/agent-management.mdx": __fd_glob_5, "guides/document-processing.mdx": __fd_glob_6, "guides/hackathon-judging.mdx": __fd_glob_7, "guides/sandbox-execution.mdx": __fd_glob_8, "guides/scheduled-reports.mdx": __fd_glob_9, "guides/webhooks.mdx": __fd_glob_10, "sdk/agents.mdx": __fd_glob_11, "sdk/jobs.mdx": __fd_glob_12, }, {"getting-started.mdx": () => import("../content/docs/getting-started.mdx?collection=docs"), "index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "guides/agent-management.mdx": () => import("../content/docs/guides/agent-management.mdx?collection=docs"), "guides/document-processing.mdx": () => import("../content/docs/guides/document-processing.mdx?collection=docs"), "guides/hackathon-judging.mdx": () => import("../content/docs/guides/hackathon-judging.mdx?collection=docs"), "guides/sandbox-execution.mdx": () => import("../content/docs/guides/sandbox-execution.mdx?collection=docs"), "guides/scheduled-reports.mdx": () => import("../content/docs/guides/scheduled-reports.mdx?collection=docs"), "guides/webhooks.mdx": () => import("../content/docs/guides/webhooks.mdx?collection=docs"), "sdk/agents.mdx": () => import("../content/docs/sdk/agents.mdx?collection=docs"), "sdk/jobs.mdx": () => import("../content/docs/sdk/jobs.mdx?collection=docs"), });