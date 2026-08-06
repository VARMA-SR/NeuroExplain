const fs = require('fs');

let data = fs.readFileSync('src/components/neuro-explain-app.tsx', 'utf-8');

// 1. Add useScroll, useSpring, useTransform, MotionValue to framer-motion import
data = data.replace(
  /import \{ AnimatePresence, motion \} from "framer-motion";/,
  'import { AnimatePresence, motion, useScroll, useSpring, useTransform, type MotionValue, useMotionValueEvent } from "framer-motion";'
);

// 2. Modify NeuralBackground to receive motion values
const oldNeuralBackground = `function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const targetFrameRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const lastDrawnFrameRef = useRef(-1);
  const totalFrames = 300;`;

const newNeuralBackground = `function NeuralBackground({ frameValue, scaleVal, xVal, yVal }: { frameValue: MotionValue<number>; scaleVal: MotionValue<number>; xVal: MotionValue<string>; yVal: MotionValue<string>; }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const lastDrawnFrameRef = useRef(-1);
  const totalFrames = 300;`;
data = data.replace(oldNeuralBackground, newNeuralBackground);

// Change NeuralBackground useEffect
// We find the useEffect that manages scrolling and replace it
const oldUseEffectScrollStart = `  useEffect(() => {
    const handleScrollAndResize = () => {`;
const oldUseEffectScrollEnd = `      window.removeEventListener("resize", handleScrollAndResize);
    };
  }, []);`;

const scrollIndexStart = data.indexOf(oldUseEffectScrollStart);
const scrollIndexEnd = data.indexOf(oldUseEffectScrollEnd) + oldUseEffectScrollEnd.length;

if (scrollIndexStart === -1 || scrollIndexEnd === -1) {
  console.log("Could not find scroll useEffect");
}

const newUseEffectScroll = `
  useMotionValueEvent(frameValue, "change", (latest) => {
    drawFrame(Math.floor(latest));
  });

  useEffect(() => {
    drawFrame(0);
  }, []);
`;
data = data.substring(0, scrollIndexStart) + newUseEffectScroll + data.substring(scrollIndexEnd);

// Find what's left of the old Image Loading useEffect `if (frameNum === 1 && !isAnimatingRef.current) { drawFrame(0); }`
data = data.replace(/if \(frameNum === 1 && !isAnimatingRef\.current\) \{.*?drawFrame\(0\);.*?\}/s, 
  'if (frameNum === 1) { drawFrame(0); }');
data = data.replace(/const currentScrollFrame = Math\.round\(currentFrameRef\.current\);.*?if \(frameNum === currentScrollFrame \+ 1\) \{.*?drawFrame\(currentScrollFrame\);.*?\}/s,
  '');
data = data.replace(/lastDrawnFrameRef\.current = -1;\s*drawFrame\(Math\.round\(currentFrameRef\.current\)\);/s,
  'lastDrawnFrameRef.current = -1; drawFrame(Math.floor(frameValue.get()));');


// Replace NeuralBackground return
const oldReturnStart = `  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050816]">`;
const oldReturnEnd = `    </div>
  );
}`;

const newReturn = `  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050816]">
      <div className="neural-grid absolute inset-0 opacity-20 z-10" />
      <motion.div style={{ scale: scaleVal, x: xVal, y: yVal, width: '100%', height: '100%' }} className="origin-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full opacity-42"
          style={{ contentVisibility: "auto" }}
        />
      </motion.div>
    </div>
  );
}`;
data = data.replace(/  return \(\s*<div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-\[#050816\]">\s*\{\/\*.*?<\/div>\s*\);\s*\}/s, newReturn);

// 3. Inject useScroll and Camera Mapping into NeuroExplainApp
const oldNeuroAppStart = `export function NeuroExplainApp() {
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);`;

const newNeuroAppStart = `export function NeuroExplainApp() {
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);

  const { scrollYProgress } = useScroll();
  
  // Non-linear mapping to "slow down" at nodes
  // Node 1: 0.1 (Intro), Node 2: 0.35 (Features), Node 3: 0.6 (Workflow), Node 4: 0.85 (Dashboard)
  const smoothProgress = useSpring(scrollYProgress, { damping: 25, stiffness: 80, restDelta: 0.001 });
  
  const frameValue = useTransform(smoothProgress, [0, 0.13, 0.17, 0.35, 0.4, 0.6, 0.65, 0.85, 0.9, 1], [0, 30, 45, 90, 110, 170, 190, 260, 280, 299]);

  const cameraScale = useTransform(frameValue, 
    [0, 15, 30,  60, 90,  130, 170,  210, 260, 285], 
    [1, 1.0, 1.25,  1.0, 1.4,  1.0, 1.3,  1.0, 1.15, 1.15]
  );
  const cameraX = useTransform(frameValue, 
    [0, 15, 30,  60, 90,  130, 170,  210, 260, 285], 
    ["0%", "0%", "6%",  "0%", "-10%",  "0%", "8%",  "0%", "0%", "0%"]
  );
  const cameraY = useTransform(frameValue, 
    [0, 15, 30,  60, 90,  130, 170,  210, 260, 285], 
    ["0%", "0%", "10%",  "0%", "-5%",  "0%", "-8%",  "0%", "0%", "0%"]
  );

  const introOpacity = useTransform(frameValue, [0, 25, 45], [1, 1, 0]);
  const introY = useTransform(frameValue, [0, 25, 45], [0, 0, -50]);

  const featuresOpacity = useTransform(frameValue, [50, 80, 100, 130], [0, 1, 1, 0]);
  const featuresY = useTransform(frameValue, [50, 80, 100, 130], [40, 0, 0, -40]);

  const workflowOpacity = useTransform(frameValue, [140, 160, 180, 210], [0, 1, 1, 0]);
  const workflowY = useTransform(frameValue, [140, 160, 180, 210], [40, 0, 0, -40]);

  const dashboardOpacity = useTransform(frameValue, [230, 250, 299], [0, 1, 1]);
  const dashboardY = useTransform(frameValue, [230, 250, 299], [40, 0, 0]);
  
  const dashboardPointerEvents = useTransform(frameValue, (v) => v > 230 ? "auto" : "none");
  const introPointerEvents = useTransform(frameValue, (v) => v < 45 ? "auto" : "none");
  const featuresPointerEvents = useTransform(frameValue, (v) => v > 50 && v < 130 ? "auto" : "none");
  const workflowPointerEvents = useTransform(frameValue, (v) => v > 140 && v < 210 ? "auto" : "none");
`;
data = data.replace(oldNeuroAppStart, newNeuroAppStart);

// 4. Update the layout DOM
data = data.replace(
  '<main className="relative min-h-screen overflow-hidden">',
  '<main className="relative h-[650vh]"><div className="fixed inset-0 overflow-hidden">'
);
data = data.replace(
  '<NeuralBackground />',
  '<NeuralBackground frameValue={frameValue} scaleVal={cameraScale} xVal={cameraX} yVal={cameraY} />'
);

data = data.replace(
  /<section id="home" className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pt-40">/,
  '<motion.section id="home" style={{ opacity: introOpacity, y: introY, pointerEvents: introPointerEvents as any }} className="absolute inset-0 z-10 mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pt-40 overflow-y-auto no-scrollbar">'
);
data = data.replace(/<\/section>\s*<section id="features"/, '</motion.section>\n\n<section id="features"');

data = data.replace(
  /<section id="features" className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">/,
  '<motion.section id="features" style={{ opacity: featuresOpacity, y: featuresY, pointerEvents: featuresPointerEvents as any }} className="absolute inset-0 z-10 mx-auto max-w-7xl px-4 pt-40 sm:px-6 lg:px-8 overflow-y-auto no-scrollbar flex flex-col justify-center">'
);
data = data.replace(/<\/section>\s*<section id="workflow"/, '</motion.section>\n\n<section id="workflow"');

data = data.replace(
  /<section id="workflow" className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">/,
  '<motion.section id="workflow" style={{ opacity: workflowOpacity, y: workflowY, pointerEvents: workflowPointerEvents as any }} className="absolute inset-0 z-10 mx-auto max-w-7xl px-4 pt-40 sm:px-6 lg:px-8 overflow-y-auto no-scrollbar flex flex-col justify-center">'
);
data = data.replace(/<\/section>\s*<section id="dashboard"/, '</motion.section>\n\n<section id="dashboard"');

data = data.replace(
  /<section id="dashboard" className="relative z-10 mx-auto max-w-\[92rem\] px-4 py-20 sm:px-6 lg:px-8">/,
  '<motion.section id="dashboard" style={{ opacity: dashboardOpacity, y: dashboardY, pointerEvents: dashboardPointerEvents as any }} className="absolute inset-0 z-10 mx-auto max-w-[92rem] px-4 py-24 sm:px-6 lg:px-8 overflow-y-auto no-scrollbar">'
);
data = data.replace(/<\/section>\s*<footer/, '</motion.section>\n\n<footer');

data = data.replace(
  /<\/footer>\s*<\/main>/,
  '</footer>\n  </div></main>'
);

fs.writeFileSync('src/components/neuro-explain-app.tsx', data);
console.log('Rewrite complete!');
