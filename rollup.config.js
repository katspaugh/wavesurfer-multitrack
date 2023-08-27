import glob from 'glob'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import nodeResolve from '@rollup/plugin-node-resolve'

const plugins = [typescript(), terser(), nodeResolve()]
const input = 'src/multitrack.ts'

export default [
  // ES module
  {
    input,
    output: {
      file: 'dist/multitrack.js',
      format: 'esm',
    },
    plugins,
  },
  // CommonJS module (Node.js)
  {
    input,
    output: {
      file: 'dist/multitrack.cjs',
      format: 'cjs',
      exports: 'default',
    },
    plugins,
  },
  // UMD (browser script tag)
  {
    input,
    output: {
      name: 'Multitrack',
      file: 'dist/multitrack.min.js',
      format: 'umd',
      exports: 'default',
    },
    plugins,
  },
]
