# JMX Studio - Enhanced

A comprehensive JMeter test configuration tool for performance testers worldwide.

## Features

- **Sampler Manager**: Clean and organize recorded scripts
- **Variables Manager**: Manage user-defined variables with find & replace
- **CSV Manager**: Configure parameterization (all CSV variants)
- **Timer Manager**: Add think time and pacing
- **Workload Calculator**: Calculate VUs using Extended Little's Law

## For Users (Running Locally)

1. Download `jmx-orchestrator.html` from the `dist` folder
2. Double-click to open in your browser
3. Upload your JMX file and start configuring!

## For Developers

### Project Structure
```
JMX_Controller/
├── src/                      # Source code (modular)
│   ├── index.html           # Main HTML
│   ├── css/                 # Styles
│   └── js/
│       ├── core/            # Core functionality
│       ├── features/        # Feature modules
│       └── utils/           # Utilities
├── dist/                    # Distribution (single HTML file)
└── build.js                 # Build script
```

### Development Setup

1. Install VS Code extension: "Live Server" by Ritwick Dey
2. Open `src/index.html`
3. Right-click → "Open with Live Server"
4. Access at `http://localhost:5500`

### Build for Distribution

```powershell
node build.js
```

This creates `dist/jmx-orchestrator.html` - a single HTML file ready to distribute.

## Technology

- Pure HTML/CSS/JavaScript (no frameworks)
- Tailwind CSS (via CDN)
- 100% client-side (no backend required)
- Zero dependencies for end users

## License

MIT License - Free to use and distribute

## Credits

Based on the original JMX Controller concept by Jenish Patel
Enhanced with advanced configuration features for global testers
