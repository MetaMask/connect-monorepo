# `create-package`

This directory contains a CLI for creating new packages in this monorepo.

## Usage

To create a new package, follow these steps:

1. Run `yarn create-package`.
   - Use the `--help` flag for usage information.
   - Once this is done, you can find a package with your chosen name in `/packages`.
2. Make sure your license is correct.
   - By default, `create-package` gives your new package an MIT license.
   - If your desired license is _not_ MIT, then you must update your `LICENSE` file and the `license` field of `package.json`.
3. Add your dependencies.
   - Do this as normal using `yarn`.
   - If your new package depends on other packages in the monorepo, make sure to add them to the `references` array in your new package's `tsconfig.json` and `tsconfig.build.json`.

And that's it!

## Updating this tool

This directory contains a [template package](./package-template). The CLI is not aware of the contents of the template, only that its files have [placeholder values](./constants.ts). When a new package is created, the template files are read from disk, the placeholder values are replaced with real ones, and the updated files are added to a new directory in `/packages`. To modify the template package:

- If you need to add or modify any files or folders, just go ahead and make your changes in `./package-template`. The CLI will read whatever's in that directory and write it to disk.
- If you need to add or modify any placeholders, make sure that your desired values are added to both the relevant file(s) and `./constants.ts`. Then, update the implementation of the CLI accordingly.
- As with placeholders, updating the monorepo files that the CLI interacts with begins by updating `./constants`.
