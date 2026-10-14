/**
 * The `@/` alias and Reanimated's plugin.
 *
 * Without the module resolver every `@/...` import fails at runtime with a
 * "module not found" that points at the import rather than at the missing
 * config — tsconfig `paths` satisfies the typechecker and does nothing at all
 * to the bundler.
 *
 * `react-native-reanimated/plugin` must be LAST. It rewrites worklets, and any
 * plugin after it sees code it does not expect.
 */
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', { root: ['./'], alias: { '@': './src' }, extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] }],
      'react-native-reanimated/plugin',
    ],
  }
}
