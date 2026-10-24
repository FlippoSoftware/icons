# Flippo Icons

A pnpm workspace with two independently published packages, organized like `flippo-ui`:

| Package | Contents |
| --- | --- |
| [`@flippo-software/svg-icons`](packages/svg-icons) | SVG files and their metadata. No React or other runtime dependency. |
| [`@flippo-software/react-icons`](packages/react-icons) | React components, ESM/CommonJS builds and TypeScript declarations. React is a required peer. |

The root is private and is not published. Both package versions retain the existing `1.0.2` baseline; this migration
does not publish a release. The root CHANGELOG preserves the old package's history.

## Using the packages

```tsx
import { CheckIcon, SpinnerIcon } from '@flippo-software/react-icons';
// An individual component, with a default export:
import Spinner from '@flippo-software/react-icons/Spinner';
import Check from '@flippo-software/react-icons/check';

<CheckIcon width={24} height={24} aria-label="Done" />;
<Spinner aria-hidden="true" width={24} height={24} />;
```

Raw SVGs use their existing snake_case names. For example, with an asset-capable bundler:

```ts
import checkUrl from '@flippo-software/svg-icons/check.svg';
import checkUrlWithoutExtension from '@flippo-software/svg-icons/check';
```

The bundler determines whether the import is a URL, text or another representation; this package supplies the
original SVG files. Import SVGs either with or without the `.svg` suffix. Metadata is exported as
`@flippo-software/svg-icons/metadata.json`. React components are available by the same lowercase SVG-name
subpaths, for example `@flippo-software/react-icons/check`; the existing root and PascalCase subpath exports remain
available.

Existing React consumers change `@flippo-ui/icons` to `@flippo-software/react-icons`; named exports such as
`CheckIcon` and `SpinnerIcon`, the individual `/Spinner` import and SVG props are preserved. SVG consumers install
`@flippo-software/svg-icons` instead of depending on the React package. React icons require React 19.1.1 or later
within major 19, matching the component workspace.

## Development

Use the Node version in `.nvmrc` and pnpm from `packageManager`:

```sh
pnpm install
pnpm build          # validates SVGs, generates React sources, builds JS and declarations
pnpm check          # build, lint, typecheck and runtime/package-contract tests
pnpm lint:packages  # pack both packages as npm would and check them with publint
pnpm src:generate   # regenerate React sources after an SVG or metadata edit
pnpm --filter @flippo-software/react-icons typecheck
```

`packages/svg-icons/icons/` and `metadata.json` are the source of truth. `packages/react-icons/src/` is generated and
versioned: do not edit it by hand. Include generated changes with an icon update so each package's release can
detect the change. CI checks that rebuilding leaves those sources unchanged. Generation validates the complete
catalogue, rejects missing/extra files and colliding component names, preserves colors and animated SVG content,
and removes components of deleted icons. It does not need Figma credentials.

Common tool versions live in `pnpm-workspace.yaml` under `catalog`. The React package uses `workspace:*` for its SVG
development dependency; the published React package embeds the SVG markup and has no runtime dependency on it.

## Updating from Figma

The existing `Monochrome/…` and `Colored/…` component selection is retained. Only these explicit commands use Figma:

```sh
pnpm src:download   # writes packages/svg-icons/icons/ and metadata.json
pnpm redown         # download, then regenerate React sources
```

The **Update icons from Figma** workflow runs every Monday and can be started manually from GitHub Actions. Configure the repository secret
`FIGMA_TOKEN` and repository variables `FIGMA_FILE`, `FIGMA_IDS` and `FIGMA_PAGES` in the repository settings.
`FIGMA_IDS` and `FIGMA_PAGES` are comma-separated lists. The workflow downloads the SVGs, regenerates the React
components, runs `pnpm check` and opens or updates a pull request against `main` only when generated files changed.
It uses the existing `RELEASE_PLEASE_TOKEN` secret to open the PR and trigger normal PR checks. For local runs, put
the same Figma values in the ignored root `.env`. Downloads are staged and validated before replacing the catalogue.
Package manifests and READMEs are outside the cleaned icon directory.

## Checks and releases

The Check workflow validates both packages and checks their npm archives with publint (`pnpm lint:packages`). The
Release workflow runs the checks (one release at a time), then
release-please creates an independent PR and tag for each package (`svg-icons-v…`, `react-icons-v…`). Use conventional
commits such as `feat(svg-icons): …` and `fix(react-icons): …`; package changes determine release scope. A shared icon
update should include its generated React sources. Publish with pnpm so workspace/catalog specifications are resolved; the publish job builds the released package
again from the release commit (`prepublishOnly`).

Configure `RELEASE_PLEASE_TOKEN` in GitHub and npm trusted publishing for each new package before enabling automated
publication. The publish guard permits the Release workflow; the first publication, needed before configuring an
existing npm package's trusted publisher, can be performed by a maintainer with `FLIPPO_FIRST_PUBLISH=1 pnpm publish`
from the relevant package. No package is published by install, build, check or pack.
