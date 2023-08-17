import { resolve } from 'import-meta-resolve'

import { installPlugins } from './install-plugins.js'
import { parseArgs } from './parse-args.js'
import { PLUGINS_PACKAGE_JSON_PATH } from './paths.js'

export async function run(args: string[]) {
  const { prettierArgs, pluginNames } = parseArgs(args)

  if (pluginNames.length) {
    try {
      await installPlugins(pluginNames)
      console.log('\n----- Running prettier -----\n')
    } catch {
      process.exit(1)
    }
  }

  const prettierCli = await import('prettier/internal/cli.mjs')

  const pnpPlugins: string[] = []
  pluginNames.forEach(pluginName => {
    pluginName = pluginName.split('@')[0]
    const resolved = resolve(pluginName, PLUGINS_PACKAGE_JSON_PATH.href)
    pnpPlugins.push('--plugin', resolved)
  })

  await prettierCli.run([...pnpPlugins, ...prettierArgs])
}
