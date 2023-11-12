import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import serve from "rollup-plugin-serve";

export default {
  input: "src/wav-to-pda.js",
  output: {
    dir: "dist",
    format: "umd",
    name: "wavToPda",
  },
  plugins: [
    commonjs({
      defaultIsModuleExports: true,
    }),
    nodeResolve({
      browser: true,
    }),
    serve(),
  ],
};
