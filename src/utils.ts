export const log = process.env.SLIENT?()=>{}:console.log;

export function splitPluginNameAndVersion(packageName: string): {
  name: string
  version: string | undefined
} {
  let name = ''

  if (packageName.startsWith('@')) {
    name = '@'
    packageName = packageName.slice(1)
  }

  name += packageName.split('@')[0]
  const version = packageName.split('@')[1]

  return {
    name,
    version,
  }
}
