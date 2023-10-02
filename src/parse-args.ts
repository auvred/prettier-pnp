import { splitPluginNameAndVersion } from './utils.js'

function extendPluginName(shortName: string) {
  return 'prettier-plugin-' + shortName
}

export interface ExtraArgs {
  quiet: boolean
}

export function parseArgs(args: string[]): {
  prettierArgs: string[]
  pluginNames: string[]
  extraArgs: ExtraArgs
} {
  const prettierArgs: string[] = []
  const pluginNames: string[] = []
  const extraArgs: ExtraArgs = {
    quiet: false,
  }

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

  function processArg(key: string, value?: string): boolean {
    switch (key) {
      case 'pnp':
        if (value) {
          pushPluginName(value)
          return true
        }
        return false
      case 'pn':
        if (value) {
          pushPluginName(extendPluginName(value))
          return true
        }
        return false
      case 'quiet':
        extraArgs.quiet = true
        return true
    }

    return false
  }

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (/^--.+=/.test(arg)) {
      const match = arg.match(/^--([^=]+)=([\s\S]*)$/)
      if (match) {
        const key = match[1]
        const value = match[2]
        if (processArg(key, value)) {
          continue
        }
      }
    } else if (/^--.+/.test(arg)) {
      const match = arg.match(/^--(.+)/)
      if (match) {
        const key = match[1]
        const next = args[index + 1]

        if (processArg(key)) {
          continue
        }

        if (
          next !== undefined &&
          !/^(-|--)[^-]/.test(next) &&
          processArg(key, next)
        ) {
          index += 1
          continue
        }
      }
    }

    prettierArgs.push(arg)
  }

  return {
    prettierArgs,
    pluginNames,
    extraArgs,
  }
}
