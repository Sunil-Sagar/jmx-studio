# JMX Studio - Quick Start Guide

## For Development (You)

### 1. Install Live Server Extension
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Live Server" by Ritwick Dey
4. Click Install

### 2. Start Development Server
1. Open `src/index.html`
2. Right-click → "Open with Live Server"
3. Browser opens at `http://127.0.0.1:5500/src/index.html`

### 3. Test Current Foundation
- Upload your `JMX_Controller_Template.jmx` file
- Verify Master Control tab works (scaling)
- Check thread groups table displays
- Test download button

### 4. Feature Development Order
**Week 1**: Variables Manager (simpler, foundational)
**Week 2**: Sampler Manager (most used)
**Week 3**: Workload Calculator + Timer + CSV
**Week 4**: Testing & polish

---

## For Distribution (Global Testers)

### When Ready to Build
```bash
npm install
npm run build
```

This creates: `dist/jmx-orchestrator.html`

### Users Just Need
1. Download `jmx-orchestrator.html`
2. Double-click to open in browser
3. Upload JMX file
4. Configure → Download
5. Done!

**Zero setup. Zero dependencies. Works anywhere.**

---

## Current Status
✅ Foundation complete (HTML, CSS, core JS)
✅ Master Control works (existing feature)
✅ Build script ready
⏳ 5 new features pending implementation

## Next: Test the foundation, then build Features 2 → 1 → 5 → 4 → 3
