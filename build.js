// Simple build script to create single HTML file for distribution
const fs = require('fs');
const path = require('path');

console.log('🔨 Building JMX Studio for distribution...\n');

// Read source files
const htmlPath = path.join(__dirname, 'src', 'index.html');
const cssPath = path.join(__dirname, 'src', 'css', 'styles.css');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

// Read all JavaScript files
const jsFiles = [
    'js/utils/calculator.js',
    'js/core/jmxParser.js',
    'js/core/jmxModifier.js',
    'js/features/samplerManager.js',
    'js/features/variablesManager.js',
    'js/features/csvManager.js',
    'js/features/timerManager.js',
    'js/features/masterController.js',
    'js/features/workloadCalculator.js',
    'js/app.js'
];

let allJs = '';
jsFiles.forEach(file => {
    const filePath = path.join(__dirname, 'src', file);
    if (fs.existsSync(filePath)) {
        let jsContent = fs.readFileSync(filePath, 'utf8');
        // Remove ES6 import/export statements
        jsContent = jsContent.replace(/^import .*/gm, '');
        jsContent = jsContent.replace(/^export /gm, '');
        allJs += jsContent + '\n\n';
    }
});

// Build single HTML file
let output = html;

// Inline CSS
output = output.replace(
    '<link rel="stylesheet" href="css/styles.css">',
    `<style>\n${css}\n</style>`
);

// Inline JavaScript (remove module scripts, add single script)
output = output.replace(
    /<script type="module" src=".*?"><\/script>/g,
    ''
);

output = output.replace(
    '</body>',
    `    <script>\n${allJs}\n    </script>\n</body>`
);

// Write output
const distPath = path.join(__dirname, 'dist', 'jmx-studio.html');
fs.writeFileSync(distPath, output, 'utf8');

const stats = fs.statSync(distPath);
const fileSizeInKB = (stats.size / 1024).toFixed(2);

console.log('✅ Build complete!');
console.log(`📦 Output: dist/jmx-studio.html`);
console.log(`📏 Size: ${fileSizeInKB} KB`);
console.log('\n✨ Ready to distribute! Users can double-click the HTML file to run.');
