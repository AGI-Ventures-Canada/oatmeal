// @ts-nocheck
import { frontmatter as __fd_glob_6 } from "../content/docs/sdk/jobs.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_5 } from "../content/docs/sdk/index.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_4 } from "../content/docs/sdk/getting-started.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_3 } from "../content/docs/sdk/agents.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_2 } from "../content/docs/index.mdx?collection=docs&only=frontmatter"
import { default as __fd_glob_1 } from "../content/docs/sdk/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docsLazy("docs", "content/docs", {"meta.json": __fd_glob_0, "sdk/meta.json": __fd_glob_1, }, {"index.mdx": __fd_glob_2, "sdk/agents.mdx": __fd_glob_3, "sdk/getting-started.mdx": __fd_glob_4, "sdk/index.mdx": __fd_glob_5, "sdk/jobs.mdx": __fd_glob_6, }, {"index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "sdk/agents.mdx": () => import("../content/docs/sdk/agents.mdx?collection=docs"), "sdk/getting-started.mdx": () => import("../content/docs/sdk/getting-started.mdx?collection=docs"), "sdk/index.mdx": () => import("../content/docs/sdk/index.mdx?collection=docs"), "sdk/jobs.mdx": () => import("../content/docs/sdk/jobs.mdx?collection=docs"), });