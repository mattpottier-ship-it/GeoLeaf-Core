# ðŸ—ï¸ AbstractRenderer - Base Class Documentation
Product Version: GeoLeaf Platform V1  **Version**: 3.2.0  
**Phase**: Phase 5 - Code Optimization  
**Author**: GeoLeaf Team

---

## ðŸ“‹ Overview

`AbstractRenderer` is a base class providing common functionality for all renderer implementations in GeoLeaf. It eliminates ~20% code duplication by centralizing:

- Dependency resolution (Log, Security, Config, Utils)
- DOM element creation utilities
- Event handler registration with automatic cleanup
- State management via WeakMap
- Consistent error handling and logging

---

## ðŸŽ¯ Benefits

| Benefit | Impact |
|---------|--------|
| **Code Reduction** | -20% duplication across renderers |
| **Consistency** | Unified patterns for DOM, events, logging |
| **Memory Safety** | Automatic cleanup prevents memory leaks |
| **Testability** | Isolated utilities easy to mock/test |
| **Maintainability** | Single source of truth for common logic |

---

## ðŸš€ Quick Start

### Basic Usage

```javascript
// 1. Extend AbstractRenderer
class MyRenderer extends GeoLeaf._Renderers.AbstractRenderer {
    constructor(options) {
        super({
            name: 'MyRenderer',
            debug: options.debug || false
        });
        this.init();
    }
    
    // 2. Implement render() method
    render(data, options) {
        const container = this.createElement('div', 'my-renderer');
        const title = this.createTextElement('h2', data.title, 'my-title');
        container.appendChild(title);
        return container;
    }
}

// 3. Instantiate and use
const renderer = new MyRenderer({ debug: true });
const element = renderer.render({ title: 'Hello World' });
document.body.appendChild(element);

// 4. Cleanup when done
renderer.destroy();
```

---

## ðŸ“š API Reference

### Constructor

```javascript
new AbstractRenderer(options)
```

**Parameters:**
- `options.name` (string, optional): Renderer name for logging (default: 'Renderer')
- `options.config` (Object, optional): Custom configuration object
- `options.debug` (boolean, optional): Enable debug logging (default: false)

**Example:**
```javascript
const renderer = new AbstractRenderer({
    name: 'MyCustomRenderer',
    config: { theme: 'dark', showIcons: true },
    debug: true
});
```

---

### Dependency Resolution

#### `getLog()`
Returns Log utility with fallback to console.

```javascript
const log = this.getLog();
log.info('Message', data);
```

#### `getSecurity()`
Returns Security utilities (escapeHtml, setSafeHTML) with fallbacks.

```javascript
const security = this.getSecurity();
const safe = security.escapeHtml(userInput);
security.setSafeHTML(element, htmlContent);
```

#### `getUtils()`
Returns Utils with resolveField function.

```javascript
const utils = this.getUtils();
const title = utils.resolveField(poi, 'title', 'label', 'name');
```

#### `getActiveProfile()`
Returns active GeoLeaf profile configuration.

```javascript
const profile = this.getActiveProfile();
if (profile && profile.icons) {
    // Use profile icons
}
```

---

### Logging Utilities

#### `log(level, message, ...args)`
Generic logging method.

```javascript
this.log('info', 'Processing data', { count: 42 });
this.log('error', 'Failed to load', error);
```

#### Convenience Methods

```javascript
this.debug('Debug message', data);   // Only if debug=true
this.info('Info message', data);
this.warn('Warning message', data);
this.error('Error message', error);
```

**Output format:**
```
[RendererName] Message data...
```

---

### DOM Builders

#### `createElement(tagName, className, attributes)`
Create DOM element with class and attributes.

```javascript
// Single class
const div = this.createElement('div', 'my-class');

// Multiple classes
const button = this.createElement('button', ['btn', 'btn-primary']);

// With attributes
const input = this.createElement('input', 'my-input', {
    type: 'text',
    placeholder: 'Enter text',
    'data-id': '123'
});
```

#### `createTextNode(text)`
Create text node safely.

```javascript
const textNode = this.createTextNode('Hello World');
element.appendChild(textNode);
```

#### `createTextElement(tagName, text, className)`
Create element with safe text content.

```javascript
const paragraph = this.createTextElement('p', 'Safe text', 'my-paragraph');
// <p class="my-paragraph">Safe text</p>
```

#### `createHTMLElement(tagName, html, className)`
Create element with sanitized HTML.

```javascript
const div = this.createHTMLElement('div', '<strong>Bold</strong>', 'content');
// HTML is sanitized via Security.setSafeHTML
```

#### `appendChildren(parent, ...children)`
Append multiple children to parent (chainable).

```javascript
const container = this.createElement('div', 'container');
this.appendChildren(
    container,
    this.createTextElement('h2', 'Title'),
    this.createTextElement('p', 'Description'),
    this.createTextElement('span', 'Footer')
);
```

---

### Event Handling

#### `addEventListener(element, event, handler, options)`
Register event listener with automatic cleanup.

```javascript
// Basic usage
this.addEventListener(button, 'click', (e) => {
    console.log('Clicked!', e);
});

// With options
this.addEventListener(container, 'scroll', this.handleScroll, {
    passive: true,
    capture: false
});

// Returns cleanup function
const cleanup = this.addEventListener(element, 'mouseover', handler);
cleanup(); // Manual cleanup if needed
```

**Key Features:**
- Automatic binding of `this` context
- Stored for automatic cleanup on destroy()
- Returns cleanup function for manual control

#### `removeAllEventListeners()`
Remove all registered event listeners.

```javascript
this.removeAllEventListeners();
// Called automatically by destroy()
```

---

### State Management

Uses WeakMap for memory-safe state storage.

#### `setState(element, state)`
Set element state.

```javascript
this.setState(container, {
    poi: { id: 123, title: 'Restaurant' },
    renderTime: Date.now(),
    isActive: true
});
```

#### `getState(element)`
Get element state.

```javascript
const state = this.getState(container);
console.log(state.poi.title); // 'Restaurant'
```

#### `updateState(element, updates)`
Merge updates with existing state.

```javascript
this.updateState(container, {
    lastClicked: Date.now(),
    clickCount: (state.clickCount || 0) + 1
});
```

#### `deleteState(element)`
Delete element state.

```javascript
this.deleteState(container);
// Automatically garbage collected when element is removed
```

---

### Lifecycle Methods

#### `init()`
Initialize renderer (override for custom initialization).

```javascript
init() {
    super.init(); // Always call parent
    this.debug('Custom initialization');
    // ... custom setup
}
```

#### `isInitialized()`
Check if renderer is initialized.

```javascript
if (!this.isInitialized()) {
    this.warn('Renderer not ready');
    return;
}
```

#### `destroy()`
Cleanup resources (override for custom cleanup).

```javascript
destroy() {
    this.debug('Custom cleanup');
    // ... custom cleanup
    super.destroy(); // Always call parent
}
```

**Destroy() automatically:**
- Removes all event listeners
- Clears state map
- Resets initialization flag

---

### Abstract Methods

#### `render(data, options)`
**Must be implemented by subclasses.**

```javascript
render(data, options) {
    // Implementation required
    const element = this.createElement('div', 'my-renderer');
    // ... render logic
    return element;
}
```

**Throws Error if not implemented:**
```
Error: MyRenderer.render() must be implemented by subclass
```

---

## ðŸŽ¨ Complete Example

```javascript
/**
 * Advanced POI Renderer using AbstractRenderer
 */
class AdvancedPOIRenderer extends GeoLeaf._Renderers.AbstractRenderer {
    constructor(options = {}) {
        super({
            name: 'AdvancedPOIRenderer',
            debug: options.debug || false,
            config: {
                showIcon: options.showIcon !== false,
                showDescription: options.showDescription !== false,
                maxDescriptionLength: options.maxDescriptionLength || 200
            }
        });
        this.init();
    }
    
    init() {
        super.init();
        this.debug('Initialized with config:', this._config);
    }
    
    render(poi, options = {}) {
        if (!poi) {
            this.warn('No POI data provided');
            return null;
        }
        
        // Create container
        const container = this.createElement('div', 'advanced-poi-renderer', {
            'data-poi-id': poi.id,
            'data-theme': this._config.theme || 'light'
        });
        
        // Store state
        this.setState(container, {
            poi: poi,
            renderTime: Date.now(),
            interactions: 0
        });
        
        // Render title with icon
        const title = this._renderTitle(poi);
        if (title) container.appendChild(title);
        
        // Render description
        if (this._config.showDescription && poi.description) {
            const desc = this._renderDescription(poi.description);
            container.appendChild(desc);
        }
        
        // Add interaction handlers
        this._addInteractionHandlers(container, poi);
        
        this.info('Rendered POI:', poi.title);
        return container;
    }
    
    _renderTitle(poi) {
        const utils = this.getUtils();
        const title = utils.resolveField(poi, 'title', 'label', 'name') || 'Untitled';
        
        const titleContainer = this.createElement('div', 'poi-title-container');
        
        // Add icon
        if (this._config.showIcon) {
            const icon = this._createIcon(poi);
            if (icon) titleContainer.appendChild(icon);
        }
        
        // Add title text
        const titleText = this.createTextElement('h3', title, 'poi-title');
        titleContainer.appendChild(titleText);
        
        return titleContainer;
    }
    
    _renderDescription(description) {
        const security = this.getSecurity();
        const maxLength = this._config.maxDescriptionLength;
        
        let text = description;
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + '...';
        }
        
        const safeText = security.escapeHtml(text);
        return this.createHTMLElement('p', safeText, 'poi-description');
    }
    
    _createIcon(poi) {
        const profile = this.getActiveProfile();
        if (!profile || !profile.icons) return null;
        
        const icon = this.createElement('span', 'poi-icon', {
            'data-category': poi.categoryId || 'default'
        });
        icon.textContent = 'ðŸ“';
        return icon;
    }
    
    _addInteractionHandlers(container, poi) {
        // Click handler
        this.addEventListener(container, 'click', (e) => {
            const state = this.getState(container);
            this.updateState(container, {
                interactions: state.interactions + 1,
                lastInteraction: Date.now()
            });
            
            this.info('POI clicked:', poi.title, 'Interactions:', state.interactions + 1);
            
            // Dispatch custom event
            const event = new CustomEvent('poi:select', {
                detail: { poi, state },
                bubbles: true
            });
            container.dispatchEvent(event);
        });
        
        // Hover handler
        this.addEventListener(container, 'mouseenter', () => {
            container.classList.add('poi-hover');
        });
        
        this.addEventListener(container, 'mouseleave', () => {
            container.classList.remove('poi-hover');
        });
    }
    
    destroy() {
        this.debug('Destroying AdvancedPOIRenderer');
        super.destroy();
    }
}

// Usage
const renderer = new AdvancedPOIRenderer({
    debug: true,
    showIcon: true,
    showDescription: true,
    maxDescriptionLength: 150
});

const poiElement = renderer.render({
    id: 'poi-123',
    title: 'La Tour Eiffel',
    description: 'Monument emblÃ©matique de Paris...',
    categoryId: 'monument'
});

document.getElementById('poi-container').appendChild(poiElement);

// Listen for custom events
poiElement.addEventListener('poi:select', (e) => {
    console.log('POI selected:', e.detail.poi);
});

// Cleanup when done
renderer.destroy();
```

---

## ðŸ§ª Testing

### Unit Test Example

```javascript
describe('AbstractRenderer', () => {
    let renderer;
    
    beforeEach(() => {
        renderer = new GeoLeaf._Renderers.AbstractRenderer({
            name: 'TestRenderer',
            debug: true
        });
    });
    
    afterEach(() => {
        renderer.destroy();
    });
    
    test('createElement creates element with class', () => {
        const div = renderer.createElement('div', 'test-class');
        expect(div.tagName).toBe('DIV');
        expect(div.className).toBe('test-class');
    });
    
    test('addEventListener registers and cleans up', () => {
        const element = document.createElement('div');
        const handler = jest.fn();
        
        renderer.addEventListener(element, 'click', handler);
        element.click();
        
        expect(handler).toHaveBeenCalledTimes(1);
        
        renderer.removeAllEventListeners();
        element.click();
        
        expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });
    
    test('state management works correctly', () => {
        const element = document.createElement('div');
        
        renderer.setState(element, { count: 0 });
        expect(renderer.getState(element).count).toBe(0);
        
        renderer.updateState(element, { count: 1 });
        expect(renderer.getState(element).count).toBe(1);
        
        renderer.deleteState(element);
        expect(renderer.getState(element)).toBeNull();
    });
});
```

---

## ðŸ“Š Migration Guide

### Before (Duplicated Code)

```javascript
// poi/renderers/field-renderers.js
function renderText(section, poi, value) {
    const escapeHtml = Security.escapeHtml || (str => {
        // Fallback implementation...
    });
    
    const element = document.createElement('p');
    element.className = 'gl-poi-sidepanel__desc';
    element.textContent = escapeHtml(value);
    return element;
}

// poi/add-form/renderers/fields-renderer.js
createFieldFromConfig(fieldConfig, layer) {
    const group = document.createElement('div');
    group.className = 'gl-poi-form-group';
    
    const label = document.createElement('label');
    label.className = 'gl-poi-form-label';
    label.textContent = fieldConfig.label || fieldConfig.field;
    
    group.appendChild(label);
    return group;
}
```

### After (Using AbstractRenderer)

```javascript
class FieldRenderer extends AbstractRenderer {
    constructor() {
        super({ name: 'FieldRenderer' });
        this.init();
    }
    
    render(fieldConfig, layer) {
        const group = this.createElement('div', 'gl-poi-form-group');
        
        const label = this.createTextElement(
            'label',
            fieldConfig.label || fieldConfig.field,
            'gl-poi-form-label'
        );
        
        group.appendChild(label);
        return group;
    }
}
```

**Benefits:**
- No fallback boilerplate
- Unified DOM creation
- Automatic cleanup
- Consistent logging

---

## ðŸ”— Related Documentation

- [Phase 5 Completion Report](../../PHASE_5_COMPLETION_REPORT.md)
- [ContentBuilder Helpers](../ui/content-builder/helpers.js)
- [Renderer Shared Utilities](../ui/content-builder/renderers-shared.js)

---

## ðŸ“ Changelog

### v1.0.0 (January 22, 2026)
- Initial release
- Core functionality: DOM builders, events, state, logging
- Example implementation: SimpleTextRenderer
- Full documentation and tests

---

**Maintained by**: GeoLeaf Core Team  
**License**: MIT  
**Questions**: See [CONTRIBUTING.md](../../CONTRIBUTING.md)
