import sys

with open('src/components/neuro-explain-app.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    if 'const [filterRisk, setFilterRisk]' in line:
        new_lines.append(line)
        new_lines.append('  const [activeModule, setActiveModule] = useState("#patients");\n')
    elif '{dashboardModules.map((item) => (' in line:
        new_lines.append(line)
        # skip until </a>
        i += 1
        while '</a>' not in lines[i]:
            i += 1
        i += 1 # skip </a>
        new_lines.append('''                  <button
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
                  </button>
''')
        continue
    elif '<div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">' in line and 'upload' in lines[i+1]:
        # We are at the start of the massive grid wrappers.
        # Let's extract the cards.
        break
    else:
        new_lines.append(line)
    i += 1

cards = {}
current_card = None
card_content = []

while i < len(lines):
    line = lines[i]
    if '<GlassCard id="upload"' in line:
        current_card = 'upload'
        card_content = [line]
    elif '<GlassCard id="analysis"' in line:
        if current_card:
            cards[current_card] = card_content
        current_card = 'analysis'
        card_content = [line]
    elif '<GlassCard id="patients"' in line:
        if current_card:
            cards[current_card] = card_content
        current_card = 'patients'
        card_content = [line]
    elif '<GlassCard id="risk"' in line:
        if current_card:
            cards[current_card] = card_content
        current_card = 'risk'
        card_content = [line]
    elif '<GlassCard className="print-card">' in line and 'Explainable AI' in lines[i+2]:
        if current_card:
            cards[current_card] = card_content
        current_card = 'explainable_ai'
        card_content = [line]
    elif '<GlassCard className="print-card">' in line and 'Visual explanation' in lines[i+2]:
        if current_card:
            cards[current_card] = card_content
        current_card = 'visual_explanation'
        card_content = [line]
    elif '<GlassCard id="history"' in line:
        if current_card:
            cards[current_card] = card_content
        current_card = 'history'
        card_content = [line]
    elif '<GlassCard id="reports"' in line:
        if current_card:
            cards[current_card] = card_content
        current_card = 'reports'
        card_content = [line]
    elif '<GlassCard id="research"' in line:
        if current_card:
            cards[current_card] = card_content
        current_card = 'research'
        card_content = [line]
    elif '<GlassCard className="print-card">' in line and 'Confusion matrix' in lines[i+2]:
        if current_card:
            cards[current_card] = card_content
        current_card = 'confusion'
        card_content = [line]
    elif '<GlassCard id="login"' in line:
        if current_card:
            cards[current_card] = card_content
        current_card = 'login'
        card_content = [line]
    elif current_card and '</GlassCard>' in line:
        card_content.append(line)
        cards[current_card] = card_content
        current_card = None
    elif current_card:
        card_content.append(line)
    elif '              </div>' in line:
        pass
    
    if '            </div>' in line and '          </div>' in lines[i+1] and '        </div>' in lines[i+2]:
        break
    i += 1

wrapper_end = i

new_lines.append('              {activeModule === "#patients" && (\n')
new_lines.append('                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">\n')
new_lines.extend(cards['patients'])
new_lines.append('                </div>\n')
new_lines.append('              )}\n')

new_lines.append('              {activeModule === "#upload" && (\n')
new_lines.append('                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">\n')
new_lines.extend(cards['upload'])
new_lines.append('                </div>\n')
new_lines.append('              )}\n')

new_lines.append('              {activeModule === "#analysis" && (\n')
new_lines.append('                <div className="mt-6 grid gap-5 xl:grid-cols-2 animate-in fade-in zoom-in-95 duration-300">\n')
new_lines.append('                  <div className="xl:col-span-2">\n')
new_lines.extend(['  ' + x for x in cards['analysis']])
new_lines.append('                  </div>\n')
new_lines.extend(cards['explainable_ai'])
new_lines.extend(cards['visual_explanation'])
new_lines.append('                </div>\n')
new_lines.append('              )}\n')

new_lines.append('              {activeModule === "#risk" && (\n')
new_lines.append('                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">\n')
new_lines.extend(cards['risk'])
new_lines.append('                </div>\n')
new_lines.append('              )}\n')

new_lines.append('              {activeModule === "#history" && (\n')
new_lines.append('                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">\n')
new_lines.extend(cards['history'])
new_lines.append('                </div>\n')
new_lines.append('              )}\n')

new_lines.append('              {activeModule === "#reports" && (\n')
new_lines.append('                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">\n')
new_lines.extend(cards['reports'])
new_lines.append('                </div>\n')
new_lines.append('              )}\n')

new_lines.append('              {activeModule === "#settings" && (\n')
new_lines.append('                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">\n')
new_lines.extend(cards['login'])
new_lines.append('                </div>\n')
new_lines.append('              )}\n')

new_lines.append('              {activeModule === "#help" && (\n')
new_lines.append('                <div className="mt-6 grid gap-5 xl:grid-cols-2 animate-in fade-in zoom-in-95 duration-300">\n')
new_lines.extend(cards['research'])
new_lines.extend(cards['confusion'])
new_lines.append('                </div>\n')
new_lines.append('              )}\n')
new_lines.append('\n')

while wrapper_end < len(lines):
    new_lines.append(lines[wrapper_end])
    wrapper_end += 1

with open('src/components/neuro-explain-app.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Rewrite complete')
