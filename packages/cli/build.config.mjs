export default {
  entries: ["src/cli"],
  outDir: "dist",
  declaration: false,
  rollup: {
    emitCJS: false,
  },
}
