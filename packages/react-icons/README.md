# @flippo-software/react-icons

Typed React components generated from the Flippo SVG catalogue. Requires React 19.1.1 or later within major 19.

```sh
pnpm add @flippo-software/react-icons react
```

```tsx
import { CheckIcon, SpinnerIcon } from '@flippo-software/react-icons';
import Spinner from '@flippo-software/react-icons/Spinner';
import Circle from '@flippo-software/react-icons/circle_check';

export function Status() {
    return <CheckIcon width={24} height={24} aria-label="Done" className="status-icon" />;
}
```

The root exports `<Name>Icon` components. Individual imports use the same PascalCase name without the `Icon` suffix
or the lowercase SVG filename and have an ESM default export, for example `/Check`, `/ArrowBack`, `/Spinner`,
`/check`, `/arrow_back` or `/circle_check`. Components accept
`React.SVGProps<SVGSVGElement>`; pass `aria-label` for a meaningful icon or `aria-hidden` for decoration. Monochrome
icons use `currentColor`; colored artwork and `Spinner`'s SVG animation are preserved.

ESM and CommonJS JavaScript and their TypeScript declarations are included. Consumers do not need to compile JSX or
install SVGR. The SVG catalogue is a development dependency only. To use raw assets, install
`@flippo-software/svg-icons` instead.

```js
const { CheckIcon } = require('@flippo-software/react-icons');
const Spinner = require('@flippo-software/react-icons/Spinner');
```

In the source workspace, edit SVGs and metadata in `packages/svg-icons`, then run `pnpm src:generate` and include
the resulting `src/` and `package.json` changes. This generates the root named exports and individual uppercase and
lowercase subpath exports. `pnpm build` also regenerates them. Do not edit generated components or package exports by hand.
