# @flippo-software/svg-icons

Flippo SVG assets and their catalogue, without a framework dependency.

```sh
pnpm add @flippo-software/svg-icons
```

Import assets using your bundler's SVG support:

```ts
import checkUrl from '@flippo-software/svg-icons/check.svg';
import spinnerUrl from '@flippo-software/svg-icons/spinner.svg';
```

The package ships raw SVG files. Your bundler determines the value of an SVG import; it is not a React component.
Names use snake_case (`arrow_back.svg`, `circle_check_fill.svg`). Files retain their viewBox, monochrome
`currentColor`, colored artwork and SVG animations. Set the rendered width/height as needed.

`@flippo-software/svg-icons/metadata.json` describes the names, component names, palettes, groups and variants.
The matching React components are available separately in `@flippo-software/react-icons`.

Import an individual SVG by its filename without the `.svg` extension, for example
`@flippo-software/svg-icons/circle_check`. The explicit `.svg` subpath such as
`@flippo-software/svg-icons/circle_check.svg` remains available too.

In the source workspace, `pnpm --filter @flippo-software/svg-icons build` checks that every metadata entry has one
valid SVG, with no unlisted files or duplicate generated component names. See the root README for downloading and
releasing icons.
