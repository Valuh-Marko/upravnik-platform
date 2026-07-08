# Bulk Create: Complex / Buildings / Units

**Feature:** One-page creation wizard for the **SUPER_ADMIN** to set up a full property structure in a single flow — optionally from a CSV. This is a SUPER_ADMIN-only flow. UPRAVNIK accounts are assigned to buildings after setup via `POST /users/system`.

---

## What we're building

A single page (`/create` or triggered from a dashboard modal) that lets an admin create:

- **A complex** with one or more buildings, each with units
- **Multiple standalone buildings** (no complex parent) with units
- **A single building** with units

All three modes share the same building + unit builder UI. The only difference is whether a complex record is created as a parent.

---

## Page layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Manual entry]  [Import from CSV]          ← tab switcher  │
├───────────────────────────┬─────────────────────────────────┤
│                           │                                  │
│   LEFT — input form       │   RIGHT — live tree preview      │
│                           │                                  │
│   Step 1: Scope           │   Complex: Blok 23               │
│   Step 2: Buildings       │   ├── Building A                 │
│   Step 3: Review & create │   │   ├── 1-1 (APARTMENT)        │
│                           │   │   ├── 1-2 (APARTMENT)        │
│                           │   └── Building B                 │
│                           │       ├── 1-1 (APARTMENT)        │
│                           │       └── 1-2 (APARTMENT)        │
└───────────────────────────┴─────────────────────────────────┘
```

The right panel updates live as the user fills the form.

---

## Step 1 — Scope selector

Three mutually exclusive options (radio/segmented control):

| Option | Label | Behavior |
|---|---|---|
| `single` | Single building | No complex created. One building card shown. |
| `multi` | Multiple buildings | No complex created. User can add N building cards. |
| `complex` | Complex (shared property) | Complex name/address fields appear. User adds buildings under it. |

> **Key rule:** `complex` is the only mode that creates a `Complex` record. In `single` and `multi` modes buildings are standalone (`complexId: null`).

---

## Step 2 — Building builder

Each building is a card with:

| Field | Type | Required |
|---|---|---|
| Building name | text | yes |
| Address | text | yes (can inherit from complex if in complex mode) |
| City | text | yes (can inherit from complex if in complex mode) |
| Unit generation | see below | — |

### Unit generation (inside each building card)

Two sub-modes toggled per building:

**Auto-generate** (default)
- Floors: number input (e.g. `4`)
- Units per floor: number input (e.g. `4`)
- Unit number pattern: dropdown — `{floor}-{unit}` (e.g. `1-1`) or sequential (e.g. `101, 102…`)
- Unit type: default type for all (APARTMENT / OFFICE / COMMERCIAL)
- Generates a preview list of unit labels below the inputs

**Manual list**
- User adds units one by one: unit number, floor, type, area (optional)
- Good for irregular buildings (mixed-use, penthouses, etc.)

In both modes, the generated unit list is editable — the user can remove or modify individual units before submitting.

---

## Step 3 — Review & create

- Full tree summary (same as live preview panel)
- Count summary: "1 complex, 2 buildings, 32 units"
- Single **Create** button → calls the bulk endpoint (see API below)
- On success: redirect to the complex or building detail page

---

## CSV import tab

An alternative to manual entry. Same page, different input method.

### CSV schema — one row per unit

```csv
complex_name,complex_address,complex_city,building_name,building_address,building_city,unit_number,floor,unit_type,area_sqm
Blok 23,Bulevar Oslobođenja 12,Novi Sad,Zgrada A,Bulevar Oslobođenja 12,Novi Sad,1-1,1,APARTMENT,52.5
Blok 23,Bulevar Oslobođenja 12,Novi Sad,Zgrada A,Bulevar Oslobođenja 12,Novi Sad,1-2,1,APARTMENT,48.0
Blok 23,Bulevar Oslobođenja 12,Novi Sad,Zgrada B,Bulevar Oslobođenja 12,Novi Sad,1-1,1,APARTMENT,55.0
,,,,Kralja Petra 5,Beograd,Stan 1,1,APARTMENT,40.0
```

**Column rules:**

| Column | Required | Notes |
|---|---|---|
| `complex_name` | no | If provided, buildings with the same `complex_name` are grouped under one complex. Leave blank for standalone buildings. |
| `complex_address` | no | Required if `complex_name` is set. |
| `complex_city` | no | Required if `complex_name` is set. |
| `building_name` | yes | Buildings with the same name + address are de-duplicated (one record created). |
| `building_address` | yes | — |
| `building_city` | yes | — |
| `unit_number` | yes | Unique within the building. |
| `floor` | no | Integer. |
| `unit_type` | no | `APARTMENT` (default) / `OFFICE` / `COMMERCIAL` |
| `area_sqm` | no | Decimal. |

### CSV import UX flow

1. User uploads a `.csv` file
2. FE parses it client-side and renders the same live tree preview
3. Validation errors shown inline (e.g. "Row 5: unit_type must be APARTMENT, OFFICE, or COMMERCIAL")
4. User can fix errors, re-upload, or correct inline
5. On confirm → same bulk API call as manual mode

---

## API — what the FE needs

### Existing endpoints (already implemented)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/complexes` | SUPER_ADMIN | Creates one complex |
| `POST` | `/buildings` | SUPER_ADMIN | Creates one building |
| `POST` | `/buildings/:buildingId/units` | UPRAVNIK | Creates one unit |

The above exist but require N sequential calls. They should not be used for this flow.

### Bulk create endpoint (implemented)

```
POST /setup/bulk
Auth: Bearer {{TOKEN}}
Roles: SUPER_ADMIN only
```

**Request body:**

```json
{
  "complex": {
    "name": "Blok 23",
    "address": "Bulevar Oslobođenja 12",
    "city": "Novi Sad"
  },
  "buildings": [
    {
      "name": "Zgrada A",
      "address": "Bulevar Oslobođenja 12",
      "city": "Novi Sad",
      "units": [
        { "unitNumber": "1-1", "floor": 1, "type": "APARTMENT", "areaSqm": 52.5 },
        { "unitNumber": "1-2", "floor": 1, "type": "APARTMENT", "areaSqm": 48.0 }
      ]
    },
    {
      "name": "Zgrada B",
      "address": "Bulevar Oslobođenja 12",
      "city": "Novi Sad",
      "units": [
        { "unitNumber": "1-1", "floor": 1, "type": "APARTMENT" }
      ]
    }
  ]
}
```

- `complex` is optional. Omit entirely for standalone buildings.
- Everything runs in a single DB transaction — if any unit fails, nothing is created.

**Success response `201`:**

```json
{
  "complex": { "id": "uuid", "name": "Blok 23" },
  "buildings": [
    { "id": "uuid", "name": "Zgrada A", "unitCount": 2 },
    { "id": "uuid", "name": "Zgrada B", "unitCount": 1 }
  ],
  "totalUnits": 3
}
```

**Error responses:**

| Status | Meaning |
|---|---|
| `400` | Validation error — missing required field, duplicate unit number within a building |
| `401` | No token / token expired |
| `403` | Authenticated user is not SUPER_ADMIN |

---

## State machine (manual flow)

```
idle
  → scope selected
    → building(s) being filled
      → all buildings valid (at least 1 unit each)
        → review state (Create button enabled)
          → submitting
            → success (redirect)
            → error (show message, stay on page)
```

The Create button is disabled until every building has a name, address, city, and at least one unit.

---

## Open questions / decisions already made

- **CSV de-duplication:** buildings with the same `building_name + building_address` in the same CSV are treated as one building — rows become units of that building. This happens client-side before the API call.
- **No partial saves:** the bulk endpoint is all-or-nothing. If the user wants to add more buildings later, they use the regular building creation flow.
- **Unit number uniqueness:** enforced per building, not globally.
- **Area is always optional** — many buildings in Serbia don't have exact sqm on file at setup time.
