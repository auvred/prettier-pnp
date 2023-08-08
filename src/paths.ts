const PLUGIN_STORE_DIRNAME = 'plugin-store'

export const PLUGIN_STORE_PATH = new URL(PLUGIN_STORE_DIRNAME, import.meta.url)
export const PLUGINS_PACKAGE_JSON_PATH = new URL(
  PLUGIN_STORE_DIRNAME + '/package.json',
  import.meta.url,
)
