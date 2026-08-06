const fs = require('fs');

const data = fs.readFileSync('src/components/neuro-explain-app.tsx', 'utf-8');
const lines = data.split('\n');
const found = {};
let current = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<GlassCard id="upload"')) { current = 'upload'; }
    else if (line.includes('<GlassCard id="analysis"')) { current = 'analysis'; }
    else if (line.includes('<GlassCard id="patients"')) { current = 'patients'; }
    else if (line.includes('<GlassCard id="risk"')) { current = 'risk'; }
    else if (line.includes('<GlassCard className="print-card">') && i+2 < lines.length && lines[i+2].includes('Explainable AI')) { current = 'explainable_ai'; }
    else if (line.includes('<GlassCard className="print-card">') && i+2 < lines.length && lines[i+2].includes('Visual explanation')) { current = 'visual_explanation'; }
    else if (line.includes('<GlassCard id="history"')) { current = 'history'; }
    else if (line.includes('<GlassCard id="reports"')) { current = 'reports'; }
    else if (line.includes('<GlassCard id="research"')) { current = 'research'; }
    else if (line.includes('<GlassCard className="print-card">') && i+2 < lines.length && lines[i+2].includes('Confusion matrix')) { current = 'confusion'; }
    else if (line.includes('<GlassCard id="login"')) { current = 'login'; }
    
    if (current && line.includes('</GlassCard>')) {
        found[current] = true;
        current = null;
    }
}
console.log("Keys found:", Object.keys(found));
