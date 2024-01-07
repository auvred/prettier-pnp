import { log } from './utils.js'
import { spawn } from 'node:child_process'
import fs from 'node:fs'

import { PLUGINS_PACKAGE_JSON_PATH, PLUGIN_STORE_PATH } from './paths.js'
import { splitPluginNameAndVersion } from './utils.js'

import type { ExtraArgs } from './parse-args.js'

const npmExecutable = process.platform.startsWith('win') ? 'npm.cmd' : 'npm'

function listStoreDependencies(): [string, string][] {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(PLUGINS_PACKAGE_JSON_PATH, 'utf-8'),
    ) as unknown

    if (
      typeof packageJson === 'object' &&
      packageJson &&
      'dependencies' in packageJson &&
      typeof packageJson.dependencies === 'object' &&
      packageJson.dependencies
    ) {
      return Object.entries(packageJson.dependencies)
    }

    return []
  } catch {
    return []
  }
}

function filterPluginsToInstall(pluginNames: string[]) {
  const storeDependencies = listStoreDependencies()
  const pluginsToInstall: string[] = []
  const installedPlugins: string[] = []

  pluginNames.forEach(rawPluginName => {
    let { name: pluginName, version: pluginVersion } =
      splitPluginNameAndVersion(rawPluginName)
    if (
      pluginVersion &&
      (pluginVersion.startsWith('^') || pluginVersion.startsWith('~'))
    ) {
      pluginVersion = pluginVersion.slice(1)
    }

    const isPluginInstalled = storeDependencies.some(
      ([dependencyName, dependencyVersion]) => {
        if (dependencyName !== pluginName) {
          return false
        }

        if (!pluginVersion) {
          return true
        }

        if (
          dependencyVersion.startsWith('^') ||
          dependencyVersion.startsWith('~')
        ) {
          dependencyVersion = dependencyVersion.slice(1)
        }

        return dependencyVersion.startsWith(pluginVersion)
      },
    )

    if (isPluginInstalled) {
      installedPlugins.push(pluginName)
    } else {
      pluginsToInstall.push(rawPluginName)
    }
  })

  return {
    pluginsToInstall,
    installedPlugins,
  }
}

export async function installPlugins(
  pluginNames: string[],
  extraArgs: ExtraArgs,
) {
  if (!pluginNames.length) {
    return
  }

  if (!fs.existsSync(PLUGIN_STORE_PATH)) {
    fs.mkdirSync(PLUGIN_STORE_PATH)
  }

  if (!fs.existsSync(PLUGINS_PACKAGE_JSON_PATH)) {
    fs.writeFileSync(PLUGINS_PACKAGE_JSON_PATH, '{}', { encoding: 'utf-8' })
  }

  const { pluginsToInstall, installedPlugins } =
    filterPluginsToInstall(pluginNames)

  if (installedPlugins.length && !extraArgs.quiet) {
    log('\n----- Already installed ----\n')
    installedPlugins.forEach(pluginName => log(` - ${pluginName}`))
  }

  if (pluginsToInstall.length) {
    if (!extraArgs.quiet) {
      log('\n---- Installing plugins ----\n')
      pluginsToInstall.forEach(pluginName => log(` - ${pluginName}`))
    }

    const child = spawn(
      npmExecutable,
      [
        'install',
        '--ignore-scripts',
        '--no-package-lock',
        '--no-lockfile',
        '--omit=dev',
        '--install-strategy=shallow',
        '--no-bin-links',
        '--no-global',
        ...pluginsToInstall,
      ],
      {
        cwd: PLUGIN_STORE_PATH,
        env: Object.assign({}, process.env, { NODE_ENV: 'production' }),
        stdio: extraArgs.quiet ? ['inherit', 'pipe', 'pipe'] : 'inherit',
      },
    )

    let stderr = ''

    if (extraArgs.quiet) {
      child.stderr?.on('data', data => (stderr += data))
    }

    return await new Promise<void>((resolve, reject) => {
      child.on('error', err => {
        if (extraArgs.quiet) {
          process.stderr.write(stderr)
        }
        reject(err)
      })
      child.on('exit', code => {
        if (code === 0) {
          return resolve()
        }
        if (extraArgs.quiet) {
          process.stderr.write(stderr)
        }
        reject()
      })
    })
  }
}
