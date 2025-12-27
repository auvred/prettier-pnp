import { resolve } from 'import-meta-resolve'

import { installPlugins } from './install-plugins.js'
import { parseArgs } from './parse-args.js'
import { PLUGINS_PACKAGE_JSON_PATH } from './paths.js'
import { splitPluginNameAndVersion } from './utils.js'

export async function run(args: string[]) {
  const { prettierArgs, pluginNames, extraArgs } = parseArgs(args)

  if (pluginNames.length) {
    try {
      await installPlugins(pluginNames, extraArgs)
      if (!extraArgs.quiet) {
        console.log('\n----- Running prettier -----\n')
      }
    } catch {
      process.exit(1)
    }
  }

  let prettierCli: typeof import('prettier/internal/cli.mjs')
  try {
    // prettier 3.6+
    prettierCli = await import('prettier/internal/legacy-cli.mjs')
  } catch {
    prettierCli = await import('prettier/internal/cli.mjs')
  }

  const pnpPlugins: string[] = []
  pluginNames.forEach(pluginName => {
    pluginName = splitPluginNameAndVersion(pluginName).name
    const resolved = resolve(pluginName, PLUGINS_PACKAGE_JSON_PATH.href)
    pnpPlugins.push('--plugin', resolved)
  })

  await prettierCli.run([...pnpPlugins, ...prettierArgs])
}
