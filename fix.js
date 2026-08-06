const fs = require('fs');
let data = fs.readFileSync('src/components/neuro-explain-app.tsx', 'utf-8');

// 1. Fix header
data = data.replace(
  '<header className="absolute inset-x-0 top-0 z-50">',
  '<header className="fixed inset-x-0 top-0 z-50">'
);

// 2. Remove overflow-y-auto no-scrollbar from all motion.sections
data = data.replaceAll(' overflow-y-auto no-scrollbar', '');

// 3. Fix the footer syntax error.
data = data.replace(
  '<footer className="relative z-10 border-t border-white/10 px-4 py-12 sm:px-6 lg:px-8">',
  '<motion.footer style={{ opacity: dashboardOpacity, pointerEvents: dashboardPointerEvents as any }} className="absolute bottom-0 w-full z-20 border-t border-white/10 px-4 py-8 sm:px-6 lg:px-8 bg-[#050816]/90 backdrop-blur-md">'
);
data = data.replace(
  /<\/footer>/g,
  '</motion.footer>'
);

fs.writeFileSync('src/components/neuro-explain-app.tsx', data);
console.log('Fixed');
