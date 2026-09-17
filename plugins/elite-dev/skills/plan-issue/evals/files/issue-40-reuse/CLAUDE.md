# Example app — Development Guide

## Conventions

- Shared, non-visual logic lives in `src/utils/`. Check that directory before you add a new
  utility module.
- A feature owns its components under `src/features/<name>/`.
- Components stay presentational. They call a utility; they do not reimplement its logic inline.
