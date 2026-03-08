import { defineBuildConfig } from "obuild"

export default defineBuildConfig({
  entries: ["src/cli"],
  outDir: "dist",
  declaration: false,
  rollup: {
    emitCJS: false,
  },
})
