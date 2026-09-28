const fs = require('fs');
const path = require('path');

const datasetsDir = path.join(__dirname, 'datasets');
if (!fs.existsSync(datasetsDir)) {
    fs.mkdirSync(datasetsDir);
}

const targetPath = path.join(datasetsDir, 'Perfect_Test_Signal.csv');

// Generate a realistic 256Hz EEG signal for 10 seconds (2560 rows)
let csvContent = "time,frontal,temporal,occipital\n";

for (let i = 0; i < 2560; i++) {
    // Normal baseline noise (variance ~400)
    let frontal = (Math.random() - 0.5) * 40;
    let temporal = (Math.random() - 0.5) * 40;
    let occipital = (Math.random() - 0.5) * 40;

    // Inject a massive Seizure event between seconds 4 and 7 (rows 1024 to 1792)
    if (i > 1024 && i < 1792) {
        // High amplitude, highly rhythmic synchronous firing (variance ~25,000)
        frontal += Math.sin(i * 0.15) * 150 + (Math.random() - 0.5) * 20;
        temporal += Math.sin(i * 0.15) * 180 + (Math.random() - 0.5) * 20; // Temporal lobe focal seizure
        occipital += Math.sin(i * 0.15) * 100 + (Math.random() - 0.5) * 20;
    }

    csvContent += `${i},${frontal.toFixed(2)},${temporal.toFixed(2)},${occipital.toFixed(2)}\n`;
}

fs.writeFileSync(targetPath, csvContent);
console.log("Successfully generated Perfect_Test_Signal.csv!");
