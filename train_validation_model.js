const { RandomForestClassifier } = require('ml-random-forest');
const fs = require('fs');
const path = require('path');

console.log("Generating dataset for Validation Gatekeeper Model...");

const X = []; // Features
const Y = []; // Labels: 1 (Valid EEG), 0 (Invalid / Noise / Image)

// 1. Generate Invalid Data (Random Noise / Images / Flatlines)
for (let i = 0; i < 500; i++) {
    // Generate an array of "invalid" data
    const length = 500;
    const type = i % 3;
    let data = [];
    if (type === 0) {
        // Flatline / Image solid color
        const val = Math.random() * 255;
        data = Array(length).fill(val);
    } else if (type === 1) {
        // High frequency random noise
        data = Array.from({ length }, () => (Math.random() - 0.5) * 1000);
    } else {
        // Linearly increasing (like a gradient image)
        data = Array.from({ length }, (_, idx) => idx * 0.5);
    }
    
    X.push(extractFeatures(data));
    Y.push(0);
}

// 2. Load Valid Data (From EEG_Scaled_data.csv)
const csvPath = path.join(__dirname, 'datasets', 'EEG_Scaled_data.csv');
if (fs.existsSync(csvPath)) {
    console.log("Loading authentic EEG data from datasets/EEG_Scaled_data.csv...");
    const buffer = Buffer.alloc(1024 * 1024 * 5); // 5 MB
    const fd = fs.openSync(csvPath, 'r');
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);

    const text = buffer.toString('utf-8');
    const lines = text.split('\n');
    let loaded = 0;
    
    for (let i = 1; i < lines.length && loaded < 500; i++) {
        const vals = lines[i].split(',').map(v => parseFloat(v)).filter(v => !isNaN(v));
        if (vals.length > 50) {
            X.push(extractFeatures(vals));
            Y.push(1); // Valid EEG
            loaded++;
        }
    }
    console.log(`Loaded ${loaded} authentic EEG samples.`);
} else {
    console.log("EEG dataset not found, generating synthetic EEG for training...");
    // Fallback if dataset is missing
    for (let i = 0; i < 500; i++) {
        const data = Array.from({ length: 500 }, (_, idx) => Math.sin(idx / 5) * 10 + (Math.random() - 0.5) * 2);
        X.push(extractFeatures(data));
        Y.push(1);
    }
}

function extractFeatures(values) {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const centered = values.map((value) => value - mean);
    const variance = centered.reduce((sum, value) => sum + value * value, 0) / values.length;
    const rms = Math.sqrt(variance);
    const maxAbs = Math.max(...values.map((value) => Math.abs(value)));
    const zeroCrossings = centered.reduce((count, value, index) => {
        if (index === 0) return count;
        return count + (Math.sign(value) !== Math.sign(centered[index - 1]) ? 1 : 0);
    }, 0);
    const spikeThreshold = rms * 1.85;
    const spikeRate = centered.filter((value) => Math.abs(value) > spikeThreshold).length / values.length;
    
    // Normalize zero crossings
    const zcRate = zeroCrossings / values.length;
    
    return [rms, maxAbs, zcRate, spikeRate, variance];
}

console.log(`Training Validation Model with ${X.length} samples...`);

const options = {
    seed: 42,
    maxFeatures: 2,
    replacement: true,
    nEstimators: 50
};

const classifier = new RandomForestClassifier(options);
classifier.train(X, Y);

const modelJson = classifier.toJSON();
const outputPath = path.join(__dirname, 'src', 'lib', 'validation_model.json');

fs.writeFileSync(outputPath, JSON.stringify(modelJson, null, 2));
console.log(`Validation ML Gatekeeper Model saved successfully to ${outputPath}`);
