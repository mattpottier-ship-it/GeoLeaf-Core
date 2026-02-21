# 📐 GeoLeaf JSON Schema Documentation

Product Version: GeoLeaf Platform V1  
**Version**: 3.2.0  
**Last Updated**: January 22, 2026

---

## 📋 Overview

This directory contains JSON Schema definitions for validating GeoLeaf configuration files. JSON Schemas provide type safety, validation, and IDE autocomplete support for configuration formats.

### Available Schemas

| Schema | File | Purpose |
|--------|------|---------|
| **Style Schema** | [style.schema.json](../../schema/style.schema.json) | Validates layer style configurations with integrated labels |

---

## 🎯 Style Schema (`style.schema.json`)

### Purpose

Validates GeoLeaf style configuration objects used for rendering map layers with custom styling and integrated labels.

### Location

```
schema/style.schema.json
```

### Schema URL

```
https://geoleaf.org/schemas/style.schema.json
```

---

## 📚 Usage

### 1. Validate Configuration in Code

```javascript
// Using AJV (recommended)
const Ajv = require('ajv');
const ajv = new Ajv();
const schema = require('../schema/style.schema.json');

const validate = ajv.compile(schema);
const valid = validate(yourStyleConfig);

if (!valid) {
  console.error('Validation errors:', validate.errors);
}
```

### 2. IDE Integration (VSCode)

Add schema reference to your JSON file:

```json
{
  "$schema": "../schema/style.schema.json",
  "id": "my-style",
  "style": {
    "fill": "#FF5733",
    "stroke": "#000000"
  }
}
```

**Benefits**:
- ✅ Autocomplete for all properties
- ✅ Inline validation errors
- ✅ Type hints on hover
- ✅ Required property warnings

### 3. Command-Line Validation

```bash
# Using ajv-cli
npm install -g ajv-cli
ajv validate -s schema/style.schema.json -d profiles/tourism/styles/*.json

# Output:
# profiles/tourism/styles/poi.json valid
# profiles/tourism/styles/route.json valid
```

---

## 📖 Style Schema Reference

### Root Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | ✅ Yes | Unique style identifier (lowercase, alphanumeric, `-`, `_`) |
| `label` | `string \| object` | ❌ No | Display name or label configuration |
| `style` | `object` | ✅ Yes | Style definition object |
| `zIndex` | `number` | ❌ No | Layer stacking order |
| `minZoom` | `number` | ❌ No | Minimum zoom level for visibility |
| `maxZoom` | `number` | ❌ No | Maximum zoom level for visibility |

### Style Object Properties

#### Fill & Stroke

```json
{
  "style": {
    "fill": "#FF5733",
    "fillOpacity": 0.8,
    "stroke": "#000000",
    "strokeWidth": 2,
    "strokeOpacity": 1.0
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `fill` | `string` | `null` | Fill color (hex, rgb, rgba) |
| `fillOpacity` | `number` | `1.0` | Fill transparency (0-1) |
| `stroke` | `string` | `null` | Stroke color |
| `strokeWidth` | `number` | `1` | Stroke width in pixels |
| `strokeOpacity` | `number` | `1.0` | Stroke transparency |

#### Point Styles (Markers)

```json
{
  "style": {
    "radius": 8,
    "symbol": "circle",
    "icon": {
      "url": "/assets/marker.png",
      "width": 32,
      "height": 32,
      "anchor": [16, 32]
    }
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `radius` | `number` | Point radius in pixels |
| `symbol` | `string` | Symbol type: `circle`, `square`, `triangle`, `star` |
| `icon` | `object` | Custom icon configuration |
| `icon.url` | `string` | Icon image URL |
| `icon.width` | `number` | Icon width in pixels |
| `icon.height` | `number` | Icon height in pixels |
| `icon.anchor` | `[number, number]` | Anchor point `[x, y]` |

#### Line Styles

```json
{
  "style": {
    "lineCap": "round",
    "lineJoin": "round",
    "lineDash": [5, 10]
  }
}
```

| Property | Type | Values | Description |
|----------|------|--------|-------------|
| `lineCap` | `string` | `butt`, `round`, `square` | Line cap style |
| `lineJoin` | `string` | `miter`, `round`, `bevel` | Line join style |
| `lineDash` | `array` | `[dash, gap, ...]` | Dash pattern |

---

## 🏷️ Integrated Labels

### Label Configuration

```json
{
  "label": {
    "enabled": true,
    "field": "name",
    "font": {
      "family": "Arial",
      "sizePt": 12,
      "weight": 50,
      "color": "#000000"
    },
    "placement": "point",
    "offset": [0, 10],
    "anchor": "bottom",
    "halo": {
      "color": "#FFFFFF",
      "width": 2
    }
  }
}
```

### Label Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable/disable labels |
| `field` | `string` | - | Feature property containing label text |
| `font.family` | `string` | `"Arial"` | Font family |
| `font.sizePt` | `number` | `12` | Font size in points (1-100) |
| `font.weight` | `number` | `50` | Font weight (0-100, 50=normal, 75=bold) |
| `font.color` | `string` | `"#000000"` | Font color |
| `placement` | `string` | `"point"` | `point`, `line`, `polygon` |
| `offset` | `[number, number]` | `[0, 0]` | Label offset `[x, y]` |
| `anchor` | `string` | `"center"` | `top`, `bottom`, `left`, `right`, `center` |
| `halo.color` | `string` | - | Halo/outline color |
| `halo.width` | `number` | `0` | Halo width in pixels |

---

## ✅ Validation Rules

### ID Format

```javascript
// Valid IDs
"my-style"        ✅
"poi_marker_01"   ✅
"route-path"      ✅

// Invalid IDs
"My Style"        ❌ (spaces)
"POI_Marker"      ❌ (uppercase)
"route@path"      ❌ (special chars)
```

**Pattern**: `^[a-z0-9_-]+$`

### Color Formats

```javascript
// Supported formats
"#FF5733"           ✅ Hex 6-digit
"#FF573380"         ✅ Hex 8-digit (with alpha)
"rgb(255, 87, 51)"  ✅ RGB
"rgba(255, 87, 51, 0.5)" ✅ RGBA

// Invalid
"FF5733"            ❌ Missing #
"red"               ❌ Named colors not validated (but may work)
```

### Numeric Ranges

| Property | Min | Max | Type |
|----------|-----|-----|------|
| `opacity` | 0 | 1 | float |
| `strokeWidth` | 0 | - | integer |
| `font.sizePt` | 1 | 100 | integer |
| `font.weight` | 0 | 100 | integer |
| `halo.width` | 0 | 50 | integer |
| `zIndex` | -1000 | 1000 | integer |

---

## 🔧 Extending the Schema

### Adding Custom Properties

If you need custom properties not in the schema:

```json
{
  "$schema": "../schema/style.schema.json",
  "id": "custom-style",
  "style": { "fill": "#FF5733" },
  
  "customProps": {
    "animation": "pulse",
    "metadata": { "author": "John Doe" }
  }
}
```

⚠️ **Note**: Custom properties will not be validated but won't break validation.

### Creating a Custom Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "allOf": [
    { "$ref": "https://geoleaf.org/schemas/style.schema.json" }
  ],
  "properties": {
    "customProp": { "type": "string" }
  }
}
```

---

## 🐛 Common Validation Errors

### Error: `data.id should match pattern`

**Problem**: ID contains invalid characters

```json
// ❌ Wrong
{ "id": "My Style 01" }

// ✅ Correct
{ "id": "my-style-01" }
```

### Error: `data should have required property 'style'`

**Problem**: Missing required `style` object

```json
// ❌ Wrong
{ "id": "my-style" }

// ✅ Correct
{ 
  "id": "my-style",
  "style": { "fill": "#FF5733" }
}
```

### Error: `data.style.fillOpacity should be <= 1`

**Problem**: Opacity value out of range

```json
// ❌ Wrong
{ "style": { "fillOpacity": 1.5 } }

// ✅ Correct
{ "style": { "fillOpacity": 0.75 } }
```

---

## 📦 Integration Examples

### GeoLeaf Config Loader

```javascript
import schema from '../schema/style.schema.json';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

export function loadStyle(styleConfig) {
  const valid = validate(styleConfig);
  
  if (!valid) {
    const errors = validate.errors.map(e => 
      `${e.dataPath} ${e.message}`
    );
    throw new Error(`Invalid style config:\n${errors.join('\n')}`);
  }
  
  return styleConfig;
}
```

### Pre-commit Hook Validation

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Validating style schemas..."

ajv validate \
  -s schema/style.schema.json \
  -d "profiles/**/styles/*.json" \
  --all-errors

if [ $? -ne 0 ]; then
  echo "❌ Style validation failed!"
  exit 1
fi

echo "✅ All styles valid"
```

---

## 📊 Schema Statistics

| Metric | Value |
|--------|-------|
| Total Properties | 35+ |
| Required Properties | 2 (`id`, `style`) |
| Optional Properties | 33+ |
| Nested Objects | 3 (`label`, `icon`, `halo`) |
| Pattern Validations | 2 (`id`, `color`) |
| Range Validations | 8 |

---

## 🔗 Related Documentation

- [Style Format Specification](../STYLE_FORMAT_SPEC.md)
- [Label System Implementation](../LABEL_SYSTEM_IMPLEMENTATION.md)
- [POI Style Parameters](../POI_STYLE_PARAMETERS.md)
- [Profile Configuration Guide](../GUIDE_PROFILE.md)

---

## 📝 Changelog

### v3.2.0 (January 2026)
- Added integrated label configuration
- Enhanced font properties validation
- Added halo/outline support

### v3.0.0 (December 2025)
- Initial schema release
- Basic style validation
- Icon configuration support

---

**Maintained by**: GeoLeaf Core Team  
**License**: Same as GeoLeaf JS (MIT)  
**Questions**: See [FAQ.md](../FAQ.md) or open an issue
