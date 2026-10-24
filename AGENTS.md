# Flippo Icons — notes for agents

- pnpm workspace: `packages/svg-icons` owns SVGs and metadata; `packages/react-icons` owns their generated React
  components and publishes ESM, CommonJS and TypeScript declarations. Shared scripts are in `tools/`.
- The SVG catalogue is the source of truth. Preserve its filenames and the existing `<Name>Icon` React exports.
  Run `pnpm src:generate` after an SVG/metadata change and include the React source changes in the same commit.
  Generated sources stay in git so release-please sees changes to each package independently.
- `pnpm check` builds, lints, typechecks and tests; `pnpm lint:packages` checks the packed packages (publint, CI). No Figma access is needed. Only `pnpm src:download` / `pnpm redown`
  use `.env.local`; never print tokens or run a download unless requested.
- Dependencies use `catalog:` for shared versions and `workspace:*` for development dependencies between packages.
  The React package has no runtime dependency on svg-icons; React is a required peer.
- Releases use conventional commits and one release PR per package. Preserve package versions and historical
  CHANGELOGs unless a release change is explicitly requested. Publish through the Release workflow using pnpm.
- Never commit, push or publish unless asked.
