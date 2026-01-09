## PDF.js Location Calculation Rule

### Coordinate Format: `[x_left, y_top, x_right, y_bottom]`

Based on the provided diagram and analysis, the location uses **absolute bounding box coordinates** in PDF coordinate space.

---

### PDF Coordinate System

- **Origin**: Bottom-left corner `(0, 0)`
- **X-axis**: Increases to the RIGHT →
- **Y-axis**: Increases UPWARD ↑ (opposite of screen/DOM)

---

### Location Array Components

```javascript
location = [x_left, y_top, x_right, y_bottom]
```

| Index | Component | Description |
|-------|-----------|-------------|
| `[0]` | `x_left` | Distance from **left edge** of page to **left edge** of selection |
| `[1]` | `y_top` | Distance from **bottom edge** of page to **top edge** of selection |
| `[2]` | `x_right` | Distance from **left edge** of page to **right edge** of selection |
| `[3]` | `y_bottom` | Distance from **bottom edge** of page to **bottom edge** of selection |

---

### Example from Diagram

**Page Size**: 793px × 1122px  
**Selection Size**: 483px × 40px  
**Location**: `[29, 789, 512, 749]`

```
┌─────────────────────────────────────────┐
│                                    1122px│
│                                         │
│   ┌─────────────────────┐               │
│29 │   483px × 40px      │ ← y_top: 789  │
│   └─────────────────────┘               │
│   x_left       x_right: 512             │
│                        y_bottom: 749    │
│                                         │
│                                         │
│(0,0)                           793px   │
└─────────────────────────────────────────┘
```

**Calculations**:
- **Width** = `x_right - x_left` = `512 - 29` = `483px` ✓
- **Height** = `y_top - y_bottom` = `789 - 749` = `40px` ✓
- **Position from top** = `1122 - 789` = `333px`
- **Position from left** = `29px`

---

### Code Implementation

```javascript
// Convert screen coordinates to PDF coordinates
const pdfCoords = pageView.getPagePoint(x, y);           // Top-left in screen → Bottom-left in PDF
const pdfCoordsEnd = pageView.getPagePoint(x + width, y + height);  // Bottom-right in screen → Top-right in PDF

// Create location array [x_left, y_top, x_right, y_bottom]
const location = [
  Math.round(pdfCoords[0]),      // x_left: left edge position
  Math.round(pdfCoordsEnd[1]),   // y_top: top edge position (higher Y value)
  Math.round(pdfCoordsEnd[0]),   // x_right: right edge position
  Math.round(pdfCoords[1]),      // y_bottom: bottom edge position (lower Y value)
];
```

---

### Key Differences from Alternative Format

❌ **Old Format** (NOT USED): `[x, y, width, height]` - Relative dimensions  
✅ **Current Format**: `[x_left, y_top, x_right, y_bottom]` - Absolute corners

**Why this format?**
- More precise for bounding box operations
- Easier to reconstruct exact selection area
- Standard in PDF annotation systems
- No need to recalculate corners for rendering

---

### Verification Formula

```javascript
// Extract dimensions from location
const [x_left, y_top, x_right, y_bottom] = location;

// Calculate dimensions
const width = x_right - x_left;
const height = y_top - y_bottom;  // Always positive (top > bottom in PDF coords)

// Calculate position from page top (for screen rendering)
const fromTop = pageHeight - y_top;
const fromLeft = x_left;
```

---

### Summary

The location calculation rule is:
**Capture the absolute bounding box coordinates** of the text selection in PDF coordinate space (bottom-left origin), storing the four corner positions as `[left, top, right, bottom]`.
