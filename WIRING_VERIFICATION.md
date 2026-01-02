# Wiring Verification - All Components Connected

## ✅ Window Function Exports (app.js)

### Thread Groups Management
- `window.renderThreadGroupsTable` → renderThreadGroupsTable()
- `window.toggleThreadGroupStatus` → toggleThreadGroupStatus(index)
- `window.deleteThreadGroup` → deleteThreadGroup(index)

### TPS Scaling Calculator
- `window.calculateScalingFactor` → calculateScalingFactor()
- `window.applyScaledValues` → applyScaledValues()
- `window.calculateAndApplyIndividualTPS` → calculateAndApplyIndividualTPS(index)
- `window.renderScalingTable` → renderScalingTable()

### Little's Law Calculator
- `window.renderWorkloadTable` → renderWorkloadTable()

### Master Controller
- `window.updatePerformanceSummary` → updatePerformanceSummary()
- `window.setMasterScale` → setMasterScale()
- `window.applyMasterScale` → applyMasterScaling()

---

## 🔄 Refresh Chain Analysis

### 1️⃣ **toggleThreadGroupStatus(index)** - Disable/Enable Thread Group
**Changes Made:**
- Updates XML: `enabled` attribute
- Updates state: `threadGroupData[index].status`

**Refreshes Triggered:**
✅ renderThreadGroupsTable() - Updates status badges
✅ updatePerformanceSummary() - Recalculates total users/TPS
✅ renderScalingTable() - Updates TPS Scaling table + Individual TPS cards
✅ renderWorkloadTable() - Updates Little's Law cards

**Use Case:** User wants to temporarily disable a thread group without deleting it

---

### 2️⃣ **deleteThreadGroup(index)** - Permanently Delete Thread Group
**Changes Made:**
- Removes XML: Deletes entire ThreadGroup element
- Updates state: Removes from `threadGroupData[]` and `originalThreadGroupCounts[]`
- Re-parses: Updates `jmxDocument`

**Refreshes Triggered:**
✅ renderThreadGroupsTable() - Removes row
✅ updatePerformanceSummary() - Recalculates totals
✅ renderSamplersTable() - Updates sampler list (samplers belong to thread groups)
✅ renderTimersTable() - Updates timer list (timers belong to thread groups)
✅ renderScalingTable() - Updates TPS Scaling table + Individual TPS cards
✅ renderWorkloadTable() - Updates Little's Law cards
✅ renderVariablesTable() - Refreshes variables display
✅ renderCSVTable() - Refreshes CSV configs display

**Use Case:** User wants to completely remove a thread group and all its components

---

### 3️⃣ **calculateScalingFactor()** - Calculate Global TPS Scaling
**Changes Made:**
- No XML changes (preview only)
- Updates UI: Shows scaling factor and scaled values per thread group

**Refreshes Triggered:**
- None (calculation only, no data modification)

**Use Case:** User wants to see what scaling to a target TPS would look like

---

### 4️⃣ **applyScaledValues()** - Apply Global TPS Scaling
**Changes Made:**
- Updates XML: `num_threads` for all thread groups
- Updates state: `threadGroupData[].count`
- Adds/Updates: Throughput timers for each thread group

**Refreshes Triggered:**
✅ renderThreadGroupsTable() - Updates user counts
✅ renderScalingTable() - Refreshes scaling table

**Use Case:** User applies proportional scaling to all thread groups based on target TPS

---

### 5️⃣ **calculateAndApplyIndividualTPS(index)** - Adjust Individual Thread Group TPS
**Changes Made:**
- Updates XML: `num_threads` for specific thread group
- Updates state: `threadGroupData[index].count`

**Refreshes Triggered:**
✅ renderThreadGroupsTable() - Updates user count for that thread group
✅ updatePerformanceSummary() - Recalculates total users/TPS
✅ renderScalingTable() - Updates TPS Scaling table (global view)
✅ renderIndividualTPSCards() - Updates Individual TPS Adjustment cards

**Use Case:** User wants to fine-tune a specific thread group's TPS independently

---

## 🎯 Button Mapping & Functions

### Thread Groups Section (index.html → app.js)
| Button | HTML onclick | Function Called | Implications |
|--------|-------------|-----------------|--------------|
| Apply | `applyThreadGroupChanges(index)` | Updates users/rampup/loops/duration for thread group | Modifies XML, refreshes table & performance summary |
| Disable/Enable | `toggleThreadGroupStatus(index)` | Toggles enabled/disabled state | Updates XML attribute, refreshes all calculator displays |
| Delete | `deleteThreadGroup(index)` | Permanently removes thread group | Removes from XML & state, refreshes ALL sections |

### TPS Scaling Calculator (index.html → workloadCalculator.js → app.js)
| Button | HTML onclick | Function Called | Implications |
|--------|-------------|-----------------|--------------|
| Calculate Scaling Factor | `calculateScalingFactor()` | Calculates scaling factor and shows preview | No XML changes, displays scaled values |
| Apply Scaled Values | `applyScaledValues()` | Applies global proportional scaling | Updates all thread group users, adds/updates timers |
| Calculate & Apply (Individual) | `calculateAndApplyIndividualTPS(index)` | Scales single thread group to target TPS | Updates one thread group, refreshes all displays |

---

## 🔗 Import/Export Chain

### app.js imports from:
```javascript
✅ ./features/workloadCalculator.js
   - renderWorkloadTable
   - renderScalingTable
   - calculateScalingFactor
   - applyScaledValues
   - calculateAndApplyIndividualTPS

✅ ./features/masterController.js
   - updatePerformanceSummary
   - applyMasterScale

✅ ./features/samplerManager.js
   - renderSamplersTable

✅ ./features/timerManager.js
   - renderTimersTable

✅ ./features/variablesManager.js
   - renderVariablesTable

✅ ./features/csvManager.js
   - renderCSVTable
```

### workloadCalculator.js exports:
```javascript
✅ renderScalingTable() - Renders TPS Scaling Calculator + Individual TPS cards
✅ renderWorkloadTable() - Renders Little's Law Calculator
✅ calculateScalingFactor() - Calculates global TPS scaling
✅ applyScaledValues() - Applies global TPS scaling
✅ calculateAndApplyIndividualTPS() - Applies individual thread group TPS
```

---

## ⚠️ Critical Dependencies

### When Thread Groups Change:
1. **Performance Summary** must refresh (total users/TPS calculation)
2. **TPS Scaling Table** must refresh (proportional distribution recalculation)
3. **Individual TPS Cards** must refresh (per-thread-group targets)
4. **Little's Law Cards** must refresh (per-thread-group calculations)
5. **Samplers/Timers** may need refresh (if thread group deleted)

### Data Flow:
```
XML (jmxData)
    ↓
Parser → jmxDocument
    ↓
extractThreadGroups() → threadGroupData[]
    ↓
╔════════════════════════════════════════╗
║ renderThreadGroupsTable()              ║
║ updatePerformanceSummary()             ║
║ renderScalingTable() + Individual TPS  ║
║ renderWorkloadTable()                  ║
╚════════════════════════════════════════╝
```

---

## ✅ All Wiring Complete

### Missing Connections Found & Fixed:
1. ✅ Added `window.renderScalingTable` export
2. ✅ Added `window.renderWorkloadTable` export
3. ✅ Added `renderScalingTable()` call in toggleThreadGroupStatus
4. ✅ Added `renderWorkloadTable()` call in toggleThreadGroupStatus
5. ✅ Added `renderScalingTable()` call in deleteThreadGroup
6. ✅ Added `renderWorkloadTable()` call in deleteThreadGroup
7. ✅ Added `renderVariablesTable()` call in deleteThreadGroup
8. ✅ Added `renderCSVTable()` call in deleteThreadGroup
9. ✅ Added `updatePerformanceSummary()` call in calculateAndApplyIndividualTPS
10. ✅ Added `renderScalingTable()` call in calculateAndApplyIndividualTPS

### All Button Functions Working:
✅ Apply (Thread Groups)
✅ Disable/Enable (Thread Groups)
✅ Delete (Thread Groups)
✅ Calculate Scaling Factor (TPS Scaling)
✅ Apply Scaled Values (TPS Scaling)
✅ Calculate & Apply (Individual TPS Adjustment)

### All Refresh Chains Complete:
✅ Thread Group changes → All sections refresh
✅ TPS Scaling changes → All relevant sections refresh
✅ Individual TPS changes → All relevant sections refresh
