## 2025-05-18 - Input Sanitization in Procedural Terrain Generation
**Vulnerability:** Untrusted/malformed inputs (`seed` or `preset`) passed to `TerrainField` / `VoxelWorld` could lead to prototype property lookups or invalid numeric computations (`NaN`/`Infinity`).
**Learning:** `seed` needs proper `>>> 0` unsigned 32-bit integer coercion to ensure determinism in PRNG algorithms while supporting seed `0`. `preset` lookups require explicit `Object.prototype.hasOwnProperty` checks to avoid picking up prototype methods like `'toString'`.
**Prevention:** Always sanitize seed values to valid uint32 and check map/record keys against `hasOwnProperty` when instantiating procedural generators from external or user-provided input.
