# Label Button Manager

Product Version: GeoLeaf Platform V1

**Module:** `src/modules/labels/label-button-manager.js`  
**Version:** 4.0.0  
**Last Updated:** January 2026  
**Lines:** 267

## Table of Contents

1. [Purpose & Architecture](#purpose--architecture)
2. [API Reference](#api-reference)
3. [State Management](#state-management)
4. [Decision Logic](#decision-logic)
5. [Integration Examples](#integration-examples)
6. [Testing](#testing)
7. [Migration Notes](#migration-notes)

---

## Purpose & Architecture

### Overview

The **Label Button Manager** is a centralized controller for label toggle buttons in the Layer Manager. It provides a single source of truth for button creation, state synchronization, and decision logic.

### Responsibilities

1. **Create** label buttons during first render of a layer in Layer Manager
2. **Synchronize** button state (enabled/disabled, active/inactive)
3. **Apply** consistent decision logic across all layers
4. **Manage** debouncing to prevent excessive updates

### Key Design Principles

- **Single Responsibility**: One module handles ALL label button logic
- **Centralized State**: No scattered button management code
- **Debounced Updates**: 300ms debounce for non-critical updates
- **Immediate Sync**: Optional immediate updates for critical changes (layer visibility)
- **Defensive Coding**: Handles missing DOM elements gracefully

---

## API Reference

### Public Methods

#### `createButton(layerId, controlsContainer)`

Creates a label button for a layer during first render.

**Parameters:**

- `layerId` (string, required) - Layer identifier
- `controlsContainer` (HTMLElement, required) - DOM container for layer controls

**Returns:**

- `HTMLElement` - The created button element
- `null` - If parameters are missing or creation fails

**Behavior:**

- Checks if button already exists (prevents duplicates)
- Creates button with emoji icon 🏷️
- Attaches click handler for label toggle
- Inserts button before visibility toggle in controls
- Initially disabled until first sync

**Example:**

```javascript
// Called by Layer Manager during first render
const button = GeoLeaf._LabelButtonManager.createButton("poi-restaurants", controlsContainer);
```

**DOM Structure:**

```html
<button
    class="gl-layer-manager__label-toggle gl-layer-manager__label-toggle--disabled"
    type="button"
    disabled
    aria-label="Afficher/masquer les étiquettes"
    aria-pressed="false"
>
    <span class="gl-layer-manager__label-toggle-icon">🏷️</span>
</button>
```

---

#### `sync(layerId)`

Synchronizes button state with debouncing (300ms delay).

**Parameters:**

- `layerId` (string, required) - Layer identifier

**Returns:** void

**Behavior:**

- Cancels any pending sync for this layer
- Schedules new sync after 300ms
- Prevents excessive DOM updates during rapid changes
- Ideal for non-critical updates (style changes, config updates)

**Example:**

```javascript
// Called after style change (non-urgent)
GeoLeaf._LabelButtonManager.sync("poi-restaurants");
```

**Use Cases:**

- Style file loaded
- Configuration updated
- Theme changed
- Non-critical state changes

---

#### `syncImmediate(layerId)`

Synchronizes button state immediately without debouncing.

**Parameters:**

- `layerId` (string, required) - Layer identifier

**Returns:** void

**Behavior:**

- Cancels any pending debounced sync
- Executes sync immediately
- Use for critical updates requiring instant feedback

**Example:**

```javascript
// Called after layer visibility toggle (urgent)
GeoLeaf._LabelButtonManager.syncImmediate("poi-restaurants");
```

**Use Cases:**

- Layer visibility toggled
- User action requiring immediate visual feedback
- Critical state changes

---

### Internal Methods

#### `_doSync(layerId)` (private)

Executes the actual synchronization logic.

**Process:**

1. Find button in DOM (with fallback to create if missing)
2. Collect current state using `_getState()`
3. Apply state to button using `_applyState()`

**Fallback Behavior:**

- If button not found but layer exists, creates button on-the-fly
- Logs debug messages for troubleshooting
- Handles missing DOM elements gracefully

---

#### `_getState(layerId)` (private)

Collects current state from all relevant components.

**Returns:**

```javascript
{
  layerId: "poi-restaurants",
  layerExists: true,
  layerVisible: true,
  labelEnabled: true,
  areLabelsActive: false
}
```

**State Properties:**

- `layerId` - Layer identifier
- `layerExists` - Layer found in GeoLeaf.GeoJSON
- `layerVisible` - Layer visibility from `_visibility.current`
- `labelEnabled` - Style has `label.enabled: true`
- `areLabelsActive` - Labels currently displayed for this layer

**Dependencies:**

- `GeoLeaf.GeoJSON.getLayerById()` - Layer data access
- `GeoLeaf.Labels.areLabelsEnabled()` - Label visibility status

---

#### `_applyState(button, state)` (private)

Applies decision logic to button based on collected state.

**Parameters:**

- `button` (HTMLElement) - Button to update
- `state` (Object) - State from `_getState()`

**Decision Logic:**

```
Can Use Labels = layerVisible AND labelEnabled

IF Can Use Labels:
  - button.disabled = false
  - Remove "gl-layer-manager__label-toggle--disabled"
  - IF areLabelsActive:
      - Add "gl-layer-manager__label-toggle--on"
      - aria-pressed = "true"
  - ELSE:
      - Remove "gl-layer-manager__label-toggle--on"
      - aria-pressed = "false"
ELSE:
  - button.disabled = true
  - Add "gl-layer-manager__label-toggle--disabled"
  - Remove "gl-layer-manager__label-toggle--on"
  - aria-pressed = "false"
```

**CSS Classes:**

- `gl-layer-manager__label-toggle` - Base class (always present)
- `gl-layer-manager__label-toggle--disabled` - Button is disabled (grayed out)
- `gl-layer-manager__label-toggle--on` - Labels are active (highlighted)

---

## State Management

### Button Registry

The module maintains internal state for each button:

```javascript
{
  _syncTimeouts: Map<layerId, timeoutId>
}
```

**Purpose:**

- Track pending debounced syncs
- Allow cancellation before execution
- Prevent duplicate updates

**Lifecycle:**

- Timeout created on `sync()` call
- Timeout cancelled if new `sync()` called before execution
- Timeout deleted after execution or cancellation

---

### State Sources

The module does NOT store layer state. It queries live state from:

1. **GeoLeaf.GeoJSON.getLayerById()**
    - `_visibility.current` - Layer visibility
    - `currentStyle.label.enabled` - Label configuration

2. **GeoLeaf.Labels.areLabelsEnabled()**
    - Current label visibility for layer

**Benefits:**

- Single source of truth (no synchronization issues)
- Always reflects latest state
- No stale data

---

## Decision Logic

### Simplified Rules (v4.0.0)

The button follows these **simple rules**:

1. **Button is ALWAYS visible** for all layers
2. **Button is clickable** IF:
    - Layer is visible (`_visibility.current = true`)
    - AND style has `label.enabled: true`
3. **Button is disabled (grayed)** IF:
    - Layer is hidden
    - OR style has `label.enabled: false`
4. **Button shows active state** IF:
    - Button is clickable
    - AND labels are currently displayed

### Visual States

| Layer Visible | label.enabled | Button State       | Visual           |
| ------------- | ------------- | ------------------ | ---------------- |
| ✅            | ✅            | Enabled, can click | Normal or Active |
| ✅            | ❌            | Disabled, grayed   | 🏷️ (grayed)      |
| ❌            | ✅            | Disabled, grayed   | 🏷️ (grayed)      |
| ❌            | ❌            | Disabled, grayed   | 🏷️ (grayed)      |

### Flowchart

```
┌─────────────────┐
│  Button Render  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Is Layer ON?   │
└────────┬────────┘
         │
    ┌────┴────┐
    │ NO      │ YES
    ▼         ▼
┌──────┐  ┌──────────────────┐
│ Gray │  │ label.enabled?   │
│ OUT  │  └────────┬─────────┘
└──────┘           │
              ┌────┴────┐
              │ NO      │ YES
              ▼         ▼
          ┌──────┐  ┌──────────┐
          │ Gray │  │ ENABLED  │
          │ OUT  │  │ clickable│
          └──────┘  └─────┬────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ areLabelsOn?  │
                  └───────┬───────┘
                          │
                     ┌────┴────┐
                     │ NO      │ YES
                     ▼         ▼
                  ┌──────┐  ┌──────┐
                  │Normal│  │Active│
                  │ 🏷️   │  │ 🏷️✨ │
                  └──────┘  └──────┘
```

---

## Integration Examples

### Example 1: Layer Manager Initial Render

**File:** `src/modules/ui/layer-manager.js`

```javascript
// During first render of layer in Layer Manager
function _renderLayerItem(layerId) {
    const layerItem = document.createElement("div");
    layerItem.classList.add("gl-layer-manager__item");
    layerItem.setAttribute("data-layer-id", layerId);

    const controls = document.createElement("div");
    controls.classList.add("gl-layer-manager__item-controls");

    // Create label button
    if (GeoLeaf._LabelButtonManager) {
        const labelButton = GeoLeaf._LabelButtonManager.createButton(layerId, controls);
    }

    // Create visibility toggle
    const visibilityToggle = _createVisibilityToggle(layerId);
    controls.appendChild(visibilityToggle);

    layerItem.appendChild(controls);
    return layerItem;
}
```

---

### Example 2: Style Loader Sync

**File:** `src/modules/labels/label-style-loader.js`

```javascript
// After loading new style file
function loadStyle(layerId, styleId) {
  const styleData = await fetchStyle(layerId, styleId);

  // Apply style to layer
  applyStyle(layerId, styleData);

  // Sync label button (debounced, non-urgent)
  if (GeoLeaf._LabelButtonManager) {
    GeoLeaf._LabelButtonManager.sync(layerId);
  }
}
```

---

### Example 3: Layer Visibility Toggle

**File:** `src/modules/ui/layer-manager.js`

```javascript
// User toggles layer visibility
function toggleLayerVisibility(layerId) {
    const layer = GeoLeaf.GeoJSON.getLayerById(layerId);

    if (layer._visibility.current) {
        // Hide layer
        map.removeLayer(layer);
        layer._visibility.current = false;
    } else {
        // Show layer
        map.addLayer(layer);
        layer._visibility.current = true;
    }

    // Sync label button IMMEDIATELY (urgent update)
    if (GeoLeaf._LabelButtonManager) {
        GeoLeaf._LabelButtonManager.syncImmediate(layerId);
    }
}
```

---

### Example 4: Label Toggle Click Handler

**Internal to createButton():**

```javascript
const onLabelToggle = function (ev) {
    ev.preventDefault();
    if (button.disabled) return;

    // Verify label.enabled in current style
    const layerData = GeoLeaf.GeoJSON.getLayerById(layerId);
    const labelEnabled = layerData?.currentStyle?.label?.enabled === true;

    if (!labelEnabled) {
        Log.warn("Cannot toggle labels: label.enabled = false");
        return;
    }

    // Toggle labels
    const newState = GeoLeaf.Labels.toggleLabels(layerId);

    // Update button visual IMMEDIATELY
    if (newState) {
        button.classList.add("gl-layer-manager__label-toggle--on");
        button.setAttribute("aria-pressed", "true");
    } else {
        button.classList.remove("gl-layer-manager__label-toggle--on");
        button.setAttribute("aria-pressed", "false");
    }
};
```

---

## Testing

### Test File

**Location:** `__tests__/labels/label-button-visibility.test.js` (302 lines)

### Test Coverage

The test suite covers:

1. **Button Creation**
    - Creates button with correct structure
    - Prevents duplicate buttons
    - Inserts button in correct position
    - Returns null for invalid parameters

2. **State Synchronization**
    - `sync()` debounces updates (300ms)
    - `syncImmediate()` executes without delay
    - Cancels pending syncs correctly
    - Handles missing buttons gracefully

3. **Decision Logic**
    - Button enabled when layer visible + label.enabled
    - Button disabled when layer hidden
    - Button disabled when label.enabled = false
    - Active state reflects label visibility

4. **Integration**
    - Works with Layer Manager render
    - Responds to visibility toggles
    - Updates on style changes
    - Handles missing GeoLeaf modules

### Running Tests

```bash
# Run all label tests
npm test -- labels

# Run button manager tests specifically
npm test -- label-button-visibility.test.js

# Run with coverage
npm run test:coverage
```

### Sample Test

```javascript
describe("LabelButtonManager", () => {
    test("button enabled when layer visible and label.enabled", () => {
        const layerId = "test-layer";

        // Setup layer
        mockLayer(layerId, {
            visible: true,
            style: { label: { enabled: true } },
        });

        // Create button
        const button = GeoLeaf._LabelButtonManager.createButton(layerId, container);

        // Sync state
        GeoLeaf._LabelButtonManager.syncImmediate(layerId);

        // Assertions
        expect(button.disabled).toBe(false);
        expect(button.classList.contains("gl-layer-manager__label-toggle--disabled")).toBe(false);
    });
});
```

---

## Migration Notes

### From v3.0 to v3.1

#### What Changed?

**Before (v3.0):**

- Label button logic scattered across multiple files
- Inconsistent state management
- Duplicate button creation code
- No debouncing (performance issues)

**After (v3.1):**

- ✅ Centralized in `label-button-manager.js`
- ✅ Single source of truth
- ✅ Debounced updates (300ms)
- ✅ Immediate sync for critical updates
- ✅ Comprehensive test coverage

#### Migration Steps

**1. Remove old button logic:**

```javascript
// DELETE this scattered code from layer-manager.js
function createLabelButton(layerId) {
    // Old implementation...
}
```

**2. Use centralized API:**

```javascript
// REPLACE with:
if (GeoLeaf._LabelButtonManager) {
    const button = GeoLeaf._LabelButtonManager.createButton(layerId, controlsContainer);
}
```

**3. Update sync calls:**

```javascript
// Old: Direct DOM manipulation
button.disabled = !canUseLabels;

// New: Use sync API
GeoLeaf._LabelButtonManager.sync(layerId);
```

#### Breaking Changes

⚠️ **Internal API Change:**

- `GeoLeaf._createLabelButton()` → `GeoLeaf._LabelButtonManager.createButton()`
- Direct button state manipulation → Use `sync()` or `syncImmediate()`

**No external API changes** - Users of GeoLeaf are not affected.

---

## Best Practices

### When to Use sync() vs syncImmediate()

| Scenario                | Method            | Reason                              |
| ----------------------- | ----------------- | ----------------------------------- |
| Style file loaded       | `sync()`          | Non-urgent, debounce OK             |
| Theme changed           | `sync()`          | Non-urgent, multiple layers         |
| Config updated          | `sync()`          | Non-urgent                          |
| Layer visibility toggle | `syncImmediate()` | User action, needs instant feedback |
| User clicks button      | Internal          | Handled by click handler            |
| Layer removed from map  | `syncImmediate()` | Critical state change               |

### Performance Tips

1. **Prefer sync() for batch updates**

    ```javascript
    // Good: Debounced
    layerIds.forEach((id) => manager.sync(id));

    // Bad: Too many immediate updates
    layerIds.forEach((id) => manager.syncImmediate(id));
    ```

2. **Don't sync if button doesn't exist yet**

    ```javascript
    // Layer Manager will create button on first render
    // No need to sync before that
    ```

3. **Trust the decision logic**
    ```javascript
    // Don't manually disable/enable buttons
    // Let _applyState() handle it
    ```

### Debugging

**Enable debug logging:**

```javascript
GeoLeaf.Config.setDebug({
    enabled: true,
    modules: ["labels", "ui"],
});
```

**Check button state in console:**

```javascript
// Get button
const button = document.querySelector(
    '[data-layer-id="poi-restaurants"] .gl-layer-manager__label-toggle'
);

// Inspect state
console.log({
    disabled: button.disabled,
    classes: button.className,
    ariaPressed: button.getAttribute("aria-pressed"),
});

// Get layer state
const state = GeoLeaf._LabelButtonManager._getState("poi-restaurants");
console.log("Layer state:", state);
```

---

## Related Documentation

- **[Labels System](../labels/README.md)** - Complete label system overview
- **[Label Renderer](../labels/LABEL_RENDERER.md)** - Label rendering engine
- **[Label Style Loader](../labels/LABEL_STYLE_LOADER.md)** - Style loading and validation
- **[Layer Manager](../ui/layer-manager/README.md)** - Layer Manager integration

---

## Support

For issues or questions about Label Button Manager:

1. Check [FAQ](../FAQ.md#labels) for common questions
2. Review [test file](__tests__/labels/label-button-visibility.test.js) for examples
3. Enable debug logging for troubleshooting
4. Open an issue on GitHub

---

**Last Updated:** January 23, 2026  
**Module Version:** 4.0.0
