# Sentinel Security Journal

## 2025-05-18 - Unsafe Dictionary Property Lookup & Prototype Pollution
**Vulnerability:** Indexed object lookups on TypeScript/JavaScript dictionary objects (`Record<string, T>`) evaluated prototype methods (e.g. `toString`, `valueOf`, `constructor`) when supplied arbitrary or user-controllable key strings.
**Learning:** Standard JS object literals inherit properties from `Object.prototype`. Direct indexing `dict[key]` on an untrusted key string returns the inherited method (a function) rather than `undefined`, bypassing simple `?? fallback` checks and leading to `NaN` math propagation or `TypeError` crashes.
**Prevention:** Guard dictionary lookups using `Object.prototype.hasOwnProperty.call(dict, key)` (or `Object.hasOwn`), or instantiate dictionary objects with `Object.create(null)`.
