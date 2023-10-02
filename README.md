# prettier-pnp

Prettier-pnp is utility for running [Prettier](https://github.com/prettier/prettier) with plugins, without installing them manually.

## Why?

Sometimes you need to format some files, but you don't want to create a `package.json`, install Prettier and plugins for it. Also Prettier can't load plugins installed globally (it tries to `import()` them, but Node.js [doesn't support import from `NODE_PATH`](https://nodejs.org/api/esm.html#esm_no_node_path)).

This may be useful for CI environments, where you need to quickly check the formatting of files.

## How?

Prettier-pnp works like a proxy for `prettier` cli. All arguments passed to `prettier-pnp` will be forwarded directly to `prettier`. Prettier-pnp adds only three new args:

- `--pnp <plugin name>` or `--pnp <plugin name>@<version>`

  Runs `prettier` with plugin named `<plugin name>` (or `<plugin name>@<version>` if the version was specified).

  Example:

  ```shell
  npx prettier-pnp --pnp prettier-plugin-curly index.js
  ```

- `--pn <short plugin name>` or `--pn <short plugin name>@<version>`

  Shorthand for `--pnp`. If plugin name starts with `prettier-plugin-`, then you can omit this part.

  Example:

  ```shell
  npx prettier-pnp --pn curly index.js
  ```

- `--quiet`

  Prevent any extra output (e.g plugin installation progress). Only the output of Prettier will be printed.

Prettier-pnp includes Prettier as dependency. Also, all requested plugins are stored in the internal storage (`plugin-store` folder inside the installed `prettier-pnp`). So, when you run:

```shell
npx prettier-pnp --pn my-plugin index.js
```

Prettier-pnp tries to install `prettier-plugin-my-plugin` as a regular NPM package. Then it resolves the absolute path to the plugin and passes it to the Prettier.

> After you uninstall `prettier-pnp`, all plugins will also be uninstalled, because they are stored inside the `plugin-store`

Let's assume that you have installed `prettier-pnp` globally to `/home/user/node_modules`. After

```shell
npx prettier-pnp --pn my-plugin --single-quote index.js
```

The folder structure will look like this:

```
/home/user/node_modules
 📂 prettier-pnp
 ├─   package.json
 ├─ 📁 dist
 └─ 📂 plugin-store
    ├─   package.json
    └─ 📂 node_modules
       └─ 📂 prettier-plugin-my-plugin
          ├─   index.js
          └─   package.json
```

And the Prettier will be executed with the following arguments:

```shell
prettier --plugin /home/user/node_modules/prettier-pnp/plugin-store/node_modules/prettier-plugin-my-plugin/index.js --single-quote index.js
```

## License

[MIT](./LICENSE) License © 2023 [auvred](https://github.com/auvred)
