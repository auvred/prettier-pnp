import { spawn } from 'node:child_process'
import fs from 'node:fs'

import { PLUGINS_PACKAGE_JSON_PATH, PLUGIN_STORE_PATH } from './paths.js'

const npmExecutable = process.platform.startsWith('win') ? 'npm.cmd' : 'npm'

export async function installNpmPackages(packages: string[]) {
  if (!packages.length) {
    return
  }

  if (!fs.existsSync(PLUGIN_STORE_PATH)) {
    fs.mkdirSync(PLUGIN_STORE_PATH)
  }

  if (!fs.existsSync(PLUGINS_PACKAGE_JSON_PATH)) {
    fs.writeFileSync(PLUGINS_PACKAGE_JSON_PATH, '{}', { encoding: 'utf-8' })
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
      ...packages,
    ],
    {
      cwd: PLUGIN_STORE_PATH,
      env: Object.assign({}, process.env, { NODE_ENV: 'production' }),
      stdio: 'inherit',
    },
  )

  return new Promise<void>((resolve, reject) => {
    child.on('error', err => {
      reject(err)
    })
    child.on('exit', code => {
      if (code === 0) {
        return resolve()
      }
      reject()
    })
  })
}
