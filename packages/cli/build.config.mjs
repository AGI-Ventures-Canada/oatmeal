const config = {
  entries: ["src/cli"],
  outDir: "dist",
  declaration: false,
  rollup: {
    emitCJS: false,
  },
}
export default config
