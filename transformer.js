const fs = require('fs');

const data = fs.readFileSync('src/components/neuro-explain-app.tsx', 'utf-8');
const lines = data.split('\n');

const newLines = [];
let i = 0;
while (i < lines.length) {
    const line = lines[i];
    if (line.includes('const [filterRisk, setFilterRisk]')) {
        newLines.push(line);
        newLines.push('  const [activeModule, setActiveModule] = useState("#patients");');
    } else if (line.includes('{dashboardModules.map((item) => (')) {
        newLines.push(line);
        i++;
        while (!lines[i].includes('</a>')) {
            i++;
        }
        i++; // skip </a>
        newLines.push(`                  <button
                    key={item.href}
                    type="button"
                    onClick={() => setActiveModule(item.href)}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-left transition",
                      activeModule === item.href
                        ? "border border-cyan-300/35 bg-cyan-300/10 text-white"
                        : "border border-transparent text-slate-300 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <item.icon className="h-4 w-4 text-cyan-200" />
                    {item.label}
                  </button>`);
        continue;
    } else if (line.includes('<div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">') && lines[i+1].includes('upload')) {
        break;
    } else {
        newLines.push(line);
    }
    i++;
}

const cards = {};
let currentCard = null;
let cardContent = [];
let wrapperEnd = i;

while (i < lines.length) {
    const line = lines[i];
    if (line.includes('<GlassCard id="upload"')) {
        currentCard = 'upload';
        cardContent = [line];
    } else if (line.includes('<GlassCard id="analysis"')) {
        if (currentCard) cards[currentCard] = cardContent;
        currentCard = 'analysis';
        cardContent = [line];
    } else if (line.includes('<GlassCard id="patients"')) {
        if (currentCard) cards[currentCard] = cardContent;
        currentCard = 'patients';
        cardContent = [line];
    } else if (line.includes('<GlassCard id="risk"')) {
        if (currentCard) cards[currentCard] = cardContent;
        currentCard = 'risk';
        cardContent = [line];
    } else if (line.includes('<GlassCard className="print-card">') && (i + 3 < lines.length && lines[i+3].includes('Explainable AI'))) {
        if (currentCard) cards[currentCard] = cardContent;
        currentCard = 'explainable_ai';
        cardContent = [line];
    } else if (line.includes('<GlassCard className="print-card">') && (i + 3 < lines.length && lines[i+3].includes('Visual explanation'))) {
        if (currentCard) cards[currentCard] = cardContent;
        currentCard = 'visual_explanation';
        cardContent = [line];
    } else if (line.includes('<GlassCard id="history"')) {
        if (currentCard) cards[currentCard] = cardContent;
        currentCard = 'history';
        cardContent = [line];
    } else if (line.includes('<GlassCard id="reports"')) {
        if (currentCard) cards[currentCard] = cardContent;
        currentCard = 'reports';
        cardContent = [line];
    } else if (line.includes('<GlassCard id="research"')) {
        if (currentCard) cards[currentCard] = cardContent;
        currentCard = 'research';
        cardContent = [line];
    } else if (line.includes('<GlassCard className="print-card">') && (i + 3 < lines.length && lines[i+3].includes('Confusion matrix'))) {
        if (currentCard) cards[currentCard] = cardContent;
        currentCard = 'confusion';
        cardContent = [line];
    } else if (line.includes('<GlassCard id="login"')) {
        if (currentCard) cards[currentCard] = cardContent;
        currentCard = 'login';
        cardContent = [line];
    } else if (currentCard && line.includes('</GlassCard>')) {
        cardContent.push(line);
        cards[currentCard] = cardContent;
        currentCard = null;
    } else if (currentCard) {
        cardContent.push(line);
    } else if (line.includes('              </div>')) {
        // ignore wrappers
    }
    
    if (line.includes('      </section>')) {
        wrapperEnd = i;
        break;
    }
    i++;
}


newLines.push('              {activeModule === "#patients" && (');
newLines.push('                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">');
newLines.push(...cards['patients']);
newLines.push('                </div>');
newLines.push('              )}');

newLines.push('              {activeModule === "#upload" && (');
newLines.push('                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">');
newLines.push(...cards['upload']);
newLines.push('                </div>');
newLines.push('              )}');

newLines.push('              {activeModule === "#analysis" && (');
newLines.push('                <div className="mt-6 grid gap-5 xl:grid-cols-2 animate-in fade-in zoom-in-95 duration-300">');
newLines.push('                  <div className="xl:col-span-2">');
newLines.push(...cards['analysis'].map(x => '  ' + x));
newLines.push('                  </div>');
newLines.push(...cards['explainable_ai']);
newLines.push(...cards['visual_explanation']);
newLines.push('                </div>');
newLines.push('              )}');

newLines.push('              {activeModule === "#risk" && (');
newLines.push('                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">');
newLines.push(...cards['risk']);
newLines.push('                </div>');
newLines.push('              )}');

newLines.push('              {activeModule === "#history" && (');
newLines.push('                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">');
newLines.push(...cards['history']);
newLines.push('                </div>');
newLines.push('              )}');

newLines.push('              {activeModule === "#reports" && (');
newLines.push('                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">');
newLines.push(...cards['reports']);
newLines.push('                </div>');
newLines.push('              )}');

newLines.push('              {activeModule === "#settings" && (');
newLines.push('                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">');
newLines.push(...cards['login']);
newLines.push('                </div>');
newLines.push('              )}');

newLines.push('              {activeModule === "#help" && (');
newLines.push('                <div className="mt-6 grid gap-5 xl:grid-cols-2 animate-in fade-in zoom-in-95 duration-300">');
newLines.push(...cards['research']);
newLines.push(...cards['confusion']);
newLines.push('                </div>');
newLines.push('              )}');

while (wrapperEnd < lines.length) {
    newLines.push(lines[wrapperEnd]);
    wrapperEnd++;
}

fs.writeFileSync('src/components/neuro-explain-app.tsx', newLines.join('\n'));
console.log('Rewrite complete')
