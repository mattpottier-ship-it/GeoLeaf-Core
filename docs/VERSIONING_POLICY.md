# GeoLeaf Versioning Policy

**Product Version:** Platform V1  
**Technical SemVer Baseline:** Core `geoleaf` `4.x` + Premium plugins `@geoleaf-plugins/*` `4.x`

---

## Purpose

This policy separates:

- **Product/marketing version** (what users see): `GeoLeaf Platform V1`
- **Technical package versions** (SemVer, tooling, CI/CD): `4.x`, `4.0.0`, etc.

This avoids breaking package history, release pipelines, dependency updates, and compatibility tracking.

---

## Official Mapping

- `GeoLeaf Platform V1` = `geoleaf@4.x` + `@geoleaf-plugins/storage@4.x` + `@geoleaf-plugins/addpoi@4.x`

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

Do **not** mass-replace `4.0.0` to `1.0.0` across the repository.

If a true technical reset to `1.0.0` is required, it must be done with **new package names** and a formal migration path.
