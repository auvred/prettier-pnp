import * as child_process from 'node:child_process'
import * as fs from 'node:fs'

const sandboxPath = new URL('../sandbox/', import.meta.url)
const sandboxNodeModulesPath = new URL('node_modules/', sandboxPath)

function cleanupNodeModules() {
  fs.rmSync(sandboxNodeModulesPath, { recursive: true, force: true })
}

function cleanupPluginStore() {
  fs.rmSync(
    new URL('prettier-pnp/dist/plugin-store/', sandboxNodeModulesPath),
    { recursive: true, force: true },
  )
}

export function runPrettierPnpCli(...args: string[]) {
  return child_process.spawnSync(
    process.platform.startsWith('win') ? 'npx.cmd' : 'npx',
    ['prettier-pnp', ...args],
    {
      cwd: sandboxPath,
      env: process.env,
      encoding: 'utf-8',
    },
  )
}

describe('prettier-pnp cli', () => {
  beforeAll(() => {
    cleanupNodeModules()

    const npmInstallResult = child_process.spawnSync(
      process.platform.startsWith('win') ? 'npm.cmd' : 'npm',
      ['install', '--no-package-lock'],
      {
        cwd: sandboxPath,
        stdio: 'inherit',
      },
    )

    if (npmInstallResult.status !== 0) {
      cleanupNodeModules()
      throw new Error('Failed to run `npm install` during setup')
    }
  })

  beforeEach(() => {
    cleanupPluginStore()
  })

  afterAll(() => {
    cleanupPluginStore()
    cleanupNodeModules()
  })

  it('should format', () => {
    const args = ['index.js']

    const result = runPrettierPnpCli(...args)

    expect(result.status).toEqual(0)
    expect(result.stdout).toMatchSnapshot()
  })

  it('should work with --pn plugin', () => {
    const args = ['--pn', 'curly', 'index.js']

    const result = runPrettierPnpCli(...args)
    const fixtureStart = result.stdout.search('/\\*\\* --- FIXTURE --- \\*/')
    const output = result.stdout.slice(fixtureStart)

    expect(fixtureStart).toBeGreaterThanOrEqual(0)
    expect(result.status).toEqual(0)
    expect(output).toMatchSnapshot()
  })

  it('should work with --pnp plugin', () => {
    const args = ['--pnp', 'prettier-plugin-curly', 'index.js']

    const result = runPrettierPnpCli(...args)
    const fixtureStart = result.stdout.search('/\\*\\* --- FIXTURE --- \\*/')
    const output = result.stdout.slice(fixtureStart)

    expect(fixtureStart).toBeGreaterThanOrEqual(0)
    expect(result.status).toEqual(0)
    expect(output).toMatchSnapshot()
  })

  it('should pass rest args to prettier', () => {
    const args = ['--pn', 'curly', '--no-semi', 'index.js']

    const result = runPrettierPnpCli(...args)
    const fixtureStart = result.stdout.search('/\\*\\* --- FIXTURE --- \\*/')
    const output = result.stdout.slice(fixtureStart)

    expect(fixtureStart).toBeGreaterThanOrEqual(0)
    expect(result.status).toEqual(0)
    expect(output).toMatchSnapshot()
  })

  it('should properly install plugins with peer deps', () => {
    const args = ['--pn', 'organize-imports', 'index.js']

    const result = runPrettierPnpCli(...args)
    const fixtureStart = result.stdout.search('/\\*\\* --- FIXTURE --- \\*/')
    const output = result.stdout.slice(fixtureStart)

    expect(fixtureStart).toBeGreaterThanOrEqual(0)
    expect(result.status).toEqual(0)
    expect(output).toMatchSnapshot()
  })
})
