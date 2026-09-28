const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'datasets', 'EEG_Scaled_data.csv');

// Read the first few megabytes to get a sense of the data
const buffer = Buffer.alloc(1024 * 1024 * 5); // 5 MB
const fd = fs.openSync(csvPath, 'r');
fs.readSync(fd, buffer, 0, buffer.length, 0);
fs.closeSync(fd);

const text = buffer.toString('utf-8');
const lines = text.split('\n');

const header = lines[0].split(',');
console.log(`Dataset has ${header.length} columns (Channels).`);

let maxVal = -Infinity;
let minVal = Infinity;
let sum = 0;
let count = 0;
let rowCount = 0;

for (let i = 1; i < Math.min(100, lines.length); i++) {
    const vals = lines[i].split(',').map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (vals.length === 0) continue;
    
    rowCount++;
    for (const v of vals) {
        if (v > maxVal) maxVal = v;
        if (v < minVal) minVal = v;
        sum += v;
        count++;
    }
}

const mean = sum / count;
console.log(`Analyzed first ${rowCount} rows.`);
console.log(`Min: ${minVal}, Max: ${maxVal}, Mean: ${mean}`);

// Look for high variance segments that might indicate seizures
let maxRowVar = 0;
let minRowVar = Infinity;

for (let i = 1; i < Math.min(100, lines.length); i++) {
    const vals = lines[i].split(',').map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (vals.length === 0) continue;
    
    const rowMean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const rowVar = vals.reduce((a, b) => a + (b - rowMean) ** 2, 0) / vals.length;
    
    if (rowVar > maxRowVar) maxRowVar = rowVar;
    if (rowVar < minRowVar) minRowVar = rowVar;
}

console.log(`Row Variance - Min: ${minRowVar}, Max: ${maxRowVar}`);
