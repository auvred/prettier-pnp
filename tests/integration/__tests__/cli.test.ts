import * as child_process from 'node:child_process'
import * as fs from 'node:fs'

const sandboxPath = new URL('../sandbox/', import.meta.url)
const sandboxNodeModulesPath = new URL('node_modules/', sandboxPath)
const pluginStorePath = new URL(
  'prettier-pnp/dist/plugin-store/',
  sandboxNodeModulesPath,
)

function cleanupNodeModules() {
  fs.rmSync(sandboxNodeModulesPath, { recursive: true, force: true })
}

function cleanupPluginStore() {
  fs.rmSync(pluginStorePath, { recursive: true, force: true })
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

function assertCliCallResult(...args: string[]) {
  const result = runPrettierPnpCli(...args)
  const fixtureStart = result.stdout.search('/\\*\\* --- FIXTURE --- \\*/')
  const output = result.stdout.slice(fixtureStart)

  expect(fixtureStart).toBeGreaterThanOrEqual(0)
  expect(result.status).toEqual(0)
  expect(output).toMatchSnapshot()
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

    assertCliCallResult(...args)
  })

  it('should work with --pnp plugin', () => {
    const args = ['--pnp', 'prettier-plugin-curly', 'index.js']

    assertCliCallResult(...args)
  })

  it('should pass rest args to prettier', () => {
    const args = ['--pn', 'curly', '--no-semi', 'index.js']

    assertCliCallResult(...args)
  })

  it('should properly install plugins with peer deps', () => {
    const args = ['--pn', 'organize-imports', 'index.js']

    assertCliCallResult(...args)
  })

  it('should dedupe plugins with identical names 1', () => {
    const args = [
      '--pn',
      'organize-imports',
      '--pnp',
      'prettier-plugin-organize-imports@latest',
      '--pn',
      'curly',
      'index.js',
    ]

    const result = runPrettierPnpCli(...args)
    expect(result.status).toEqual(0)
    expect(result.stdout.split('\n').slice(0, 6).join('\n'))
      .toMatchInlineSnapshot(`
        "
        ---- Installing plugins ----

         - prettier-plugin-organize-imports
         - prettier-plugin-curly
        "
      `)
  })

  it('should dedupe plugins with identical names 2', () => {
    const args = [
      '--pnp',
      'prettier-plugin-organize-imports@latest',
      '--pn',
      'organize-imports@duplicated',
      'index.js',
    ]

    const result = runPrettierPnpCli(...args)
    expect(result.status).toEqual(0)
    expect(result.stdout.split('\n').slice(0, 5).join('\n'))
      .toMatchInlineSnapshot(`
        "
        ---- Installing plugins ----

         - prettier-plugin-organize-imports@latest
        "
      `)
  })

  it('should install plugins with specific version', () => {
    const args = [
      '--pn',
      'organize-imports@~3.0.2',
      'index.js',
    ]

    assertCliCallResult(...args)
    const packageJson = fs.readFileSync(
      new URL('package.json', pluginStorePath),
      'utf-8',
    )

    expect(packageJson).toMatchSnapshot()
  })

  it('should install plugin with a name starting with @', () => {
    const args1 = ['--pnp', '@prettier/plugin-php', 'index.js']

    const result = runPrettierPnpCli(...args1)
    expect(result.status).toEqual(0)
    expect(result.stdout.split('\n').slice(0, 5).join('\n'))
      .toMatchInlineSnapshot(`
        "
        ---- Installing plugins ----

         - @prettier/plugin-php
        "
      `)
  })

  it('should not try to install already installed plugins', () => {
    const args1 = ['--pn', 'curly', 'index.js']
    const args2 = ['--pn', 'curly', '--pn', 'organize-imports', 'index.js']

    const firstRun = runPrettierPnpCli(...args1)
    expect(firstRun.status).toEqual(0)
    expect(firstRun.stdout.split('\n').slice(0, 5).join('\n'))
      .toMatchInlineSnapshot(`
        "
        ---- Installing plugins ----

         - prettier-plugin-curly
        "
      `)

    const runWithSamePlugin = runPrettierPnpCli(...args1)
    expect(runWithSamePlugin.status).toEqual(0)
    expect(runWithSamePlugin.stdout).toMatchInlineSnapshot(`
      "
      ----- Already installed ----

       - prettier-plugin-curly

      ----- Running prettier -----

      /** --- FIXTURE --- */

      const a = 5;

      if (false) {
        true;
      }
      "
    `)

    const runWithNewPlugin = runPrettierPnpCli(...args2)
    expect(runWithNewPlugin.status).toEqual(0)
    expect(runWithNewPlugin.stdout.split('\n').slice(0, 9).join('\n'))
      .toMatchInlineSnapshot(`
        "
        ----- Already installed ----

         - prettier-plugin-curly

        ---- Installing plugins ----

         - prettier-plugin-organize-imports
        "
      `)

    const runWithNewPluginAgain = runPrettierPnpCli(...args2)
    expect(runWithNewPluginAgain.status).toEqual(0)
    expect(runWithNewPluginAgain.stdout).toMatchInlineSnapshot(`
      "
      ----- Already installed ----

       - prettier-plugin-curly
       - prettier-plugin-organize-imports

      ----- Running prettier -----

      /** --- FIXTURE --- */

      const a = 5;

      if (false) {
        true;
      }
      "
    `)
  })

  it('should not try to install already installed plugins (with fixed version)', () => {
    const args1 = ['--pn', 'curly@0.1.1', 'index.js']
    const args = [
      ['--pn', 'curly@0.1.1', 'index.js'],
      ['--pn', 'curly@^0.1.1', 'index.js'],
      ['--pn', 'curly@~0.1.1', 'index.js'],
    ]

    const firstRun = runPrettierPnpCli(...args1)
    expect(firstRun.status).toEqual(0)
    expect(firstRun.stdout.split('\n').slice(0, 5).join('\n'))
      .toMatchInlineSnapshot(`
        "
        ---- Installing plugins ----

         - prettier-plugin-curly@0.1.1
        "
      `)

    args.forEach(args => {
      const result = runPrettierPnpCli(...args)
      expect(result.status).toEqual(0)
      expect(result.stdout).toMatchSnapshot()
    })
  })

  it('should reinstall plugin if new version specified', () => {
    const args1 = ['--pn', 'curly@0.1.1', 'index.js']
    const args2 = ['--pn', 'curly@0.1.2', 'index.js']

    const firstRun = runPrettierPnpCli(...args1)
    expect(firstRun.status).toEqual(0)
    expect(firstRun.stdout.split('\n').slice(0, 5).join('\n'))
      .toMatchInlineSnapshot(`
        "
        ---- Installing plugins ----

         - prettier-plugin-curly@0.1.1
        "
      `)

    const secondRun = runPrettierPnpCli(...args2)
    expect(secondRun.status).toEqual(0)
    expect(secondRun.stdout.split('\n').slice(0, 5).join('\n'))
      .toMatchInlineSnapshot(`
        "
        ---- Installing plugins ----

         - prettier-plugin-curly@0.1.2
        "
      `)
  })

  describe('w/ --quite', () => {
    it('should be less verbose', () => {
      const args = ['--pn', 'curly', '--no-semi', '--quiet', 'index.js']

      assertCliCallResult(...args)
    })

    it('should print out npm stderr', () => {
      const args = ['--pn', 'curly_', '--quiet', 'index.js']

      const result = runPrettierPnpCli(...args)
      expect(result.status).toEqual(1)
      expect(result.stdout).toEqual('')
      expect(result.stderr.split('\n').slice(0, 8).join('\n'))
        .toContain(`404 Not Found - GET https://registry.npmjs.org/prettier-plugin-curly_ - Not found`)
    })
  })
})
