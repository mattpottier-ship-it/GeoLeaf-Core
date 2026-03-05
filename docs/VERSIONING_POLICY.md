# GeoLeaf Versioning Policy

**Product Version:** Platform V1  
**Technical SemVer Baseline:** Core `geoleaf` `1.1.x`

---

## Purpose

This policy separates:

- **Product/marketing version** (what users see): `GeoLeaf Platform V1`
- **Technical package versions** (SemVer, tooling, CI/CD): `1.1.x`, `1.1.0`, etc.

This avoids breaking package history, release pipelines, dependency updates, and compatibility tracking.

---

## Official Mapping

- `GeoLeaf Platform V1` = `geoleaf@1.1.x`

---

## Documentation Rules

Use **Platform V1** in:

- Landing pages and project overviews
- Product positioning sections
- Executive summaries and business-facing documents

Keep **technical SemVer** in:

- `package.json` files
- `CHANGELOG.md`
- release notes and git tags
- CDN/npm installation snippets
- migration and compatibility matrices

---

## Important

As of V1.1.0, the technical SemVer baseline is **1.1.x**. For future major/minor bumps, update package.json and docs consistently.
