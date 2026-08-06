const fs = require('fs');
let data = fs.readFileSync('src/components/neuro-explain-app.tsx', 'utf-8');

// 1. Extend the scroll runway
data = data.replace(
  '<main className="relative h-[650vh]">',
  '<main className="relative h-[850vh]">'
);

// 2. Adjust mapping for dashboardY to translate up between frames 260 and 299
// Current: const dashboardY = useTransform(frameValue, [230, 250, 299], [40, 0, 0]);
// We want dashboard to fade in and settle at 0, then slowly scroll up as they keep scrolling.
data = data.replace(
  'const dashboardY = useTransform(frameValue, [230, 250, 299], [40, 0, 0]);',
  'const dashboardY = useTransform(frameValue, [230, 250, 260, 299], ["15vh", "0vh", "0vh", "-65vh"]);'
);

data = data.replace(
  'const dashboardOpacity = useTransform(frameValue, [230, 250, 299], [0, 1, 1]);',
  'const dashboardOpacity = useTransform(frameValue, [230, 250, 260, 299], [0, 1, 1, 1]);'
);

// 3. Remove overflow-y-auto no-scrollbar from dashboard section
data = data.replace(
  '<motion.section id="dashboard" style={{ opacity: dashboardOpacity, y: dashboardY, pointerEvents: dashboardPointerEvents as any }} className="absolute inset-0 z-10 mx-auto max-w-[92rem] px-4 py-24 sm:px-6 lg:px-8 overflow-y-auto no-scrollbar">',
  '<motion.section id="dashboard" style={{ opacity: dashboardOpacity, y: dashboardY, pointerEvents: dashboardPointerEvents as any }} className="absolute inset-0 z-10 mx-auto max-w-[92rem] px-4 py-24 sm:px-6 lg:px-8">'
);

fs.writeFileSync('src/components/neuro-explain-app.tsx', data);
console.log('Fixed scroll dashboard');
