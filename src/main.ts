import { resolve } from 'import-meta-resolve'

import { installNpmPackages } from './install-npm-packages.js'
import { parseArgs } from './parse-args.js'
import { PLUGINS_PACKAGE_JSON_PATH } from './paths.js'

export async function run(args: string[]) {
  const { prettierArgs, pluginNames } = parseArgs(args)

  try {
    await installNpmPackages(pluginNames)
  } catch {
    process.exit(1)
  }

  const prettierCli = await import('prettier/internal/cli.mjs')

  const pnpPlugins: string[] = []
  pluginNames.forEach(pluginName => {
    const resolved = resolve(pluginName, PLUGINS_PACKAGE_JSON_PATH.href)
    pnpPlugins.push('--plugin', resolved)
  })

  await prettierCli.run([...pnpPlugins, ...prettierArgs])
}
