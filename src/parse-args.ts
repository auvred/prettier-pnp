import { splitPluginNameAndVersion } from './utils.js'

function extendPluginName(shortName: string) {
  return 'prettier-plugin-' + shortName
}

export function parseArgs(args: string[]): {
  prettierArgs: string[]
  pluginNames: string[]
} {
  const prettierArgs: string[] = []
  const pluginNames: string[] = []

  function pushPluginName(pluginName: string) {
    const isDuplicated = pluginNames.some(
      name =>
        splitPluginNameAndVersion(name).name ===
        splitPluginNameAndVersion(pluginName).name,
    )

    if (isDuplicated) {
      return
    }

    pluginNames.push(pluginName)
  }

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (/^--.+=/.test(arg)) {
      const match = arg.match(/^--([^=]+)=([\s\S]*)$/)
      if (match) {
        const key = match[1]
        const value = match[2]
        if (key === 'pnp') {
          pushPluginName(value)
          continue
        } else if (key === 'pn') {
          pushPluginName(extendPluginName(value))
        }
      }
    } else if (/^--.+/.test(arg)) {
      const match = arg.match(/^--(.+)/)
      if (match) {
        const key = match[1]
        if (key === 'pnp' || key === 'pn') {
          const next = args[index + 1]
          if (next !== undefined && !/^(-|--)[^-]/.test(next)) {
            if (key === 'pnp') {
              pushPluginName(next)
            } else if (key === 'pn') {
              pushPluginName(extendPluginName(next))
            }
            index += 1
          }
          continue
        }
      }
    }

    prettierArgs.push(arg)
  }

  return {
    prettierArgs,
    pluginNames,
  }
}
