const fs = require('fs');
const path = require('path');

const archivePath = 'C:\\Users\\tunas\\Downloads\\archive';
const files = fs.readdirSync(archivePath).filter(f => f.endsWith('.csv'));

let allRms = [];
let allEntropy = [];
let allMaxAbs = [];
let allZeroCrossings = [];

function extractFeatures(values) {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const centered = values.map(v => v - mean);
  const variance = centered.reduce((sum, v) => sum + v * v, 0) / values.length;
  const rms = Math.sqrt(variance);
  const maxAbs = Math.max(...values.map(Math.abs));
  
  let zeroCrossings = 0;
  for (let i = 1; i < centered.length; i++) {
    if (Math.sign(centered[i]) !== Math.sign(centered[i - 1])) {
      zeroCrossings++;
    }
  }
  zeroCrossings /= values.length;

  const entropyBuckets = new Array(12).fill(0);
  const min = Math.min(...centered);
  const max = Math.max(...centered);
  centered.forEach((value) => {
    let bucket = Math.floor(((value - min) / Math.max(max - min, 1)) * entropyBuckets.length);
    bucket = Math.max(0, Math.min(bucket, entropyBuckets.length - 1));
    entropyBuckets[bucket] += 1;
  });
  
  const entropy = entropyBuckets.reduce((sum, count) => {
    if (!count) return sum;
    const p = count / values.length;
    return sum - p * Math.log2(p);
  }, 0);

  return { rms, maxAbs, zeroCrossings, entropy };
}

console.log(`Processing ${files.length} files...`);

files.forEach(file => {
  const content = fs.readFileSync(path.join(archivePath, file), 'utf8');
  // Just sample first 10,000 points to keep training fast (represents a good baseline segment)
  const textSample = content.slice(0, 100000);
  const values = textSample.split(/[\s,;\n\r\t]+/).map(parseFloat).filter(Number.isFinite).slice(0, 5000);
  
  if (values.length > 0) {
    const feats = extractFeatures(values);
    allRms.push(feats.rms);
    allMaxAbs.push(feats.maxAbs);
    allZeroCrossings.push(feats.zeroCrossings);
    allEntropy.push(feats.entropy);
  }
});

function mean(arr) {
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}

function std(arr, m) {
  return Math.sqrt(arr.reduce((a,b)=>a+Math.pow(b-m, 2), 0)/arr.length);
}

const rmsMean = mean(allRms);
const rmsStd = std(allRms, rmsMean);

const maxAbsMean = mean(allMaxAbs);
const maxAbsStd = std(allMaxAbs, maxAbsMean);

const zeroCrossingsMean = mean(allZeroCrossings);
const zeroCrossingsStd = std(allZeroCrossings, zeroCrossingsMean);

const entropyMean = mean(allEntropy);
const entropyStd = std(allEntropy, entropyMean);

const modelWeights = {
  trainedOnCount: files.length,
  features: {
    rms: { mean: rmsMean, std: rmsStd },
    maxAbs: { mean: maxAbsMean, std: maxAbsStd },
    zeroCrossings: { mean: zeroCrossingsMean, std: zeroCrossingsStd },
    entropy: { mean: entropyMean, std: entropyStd }
  }
};

fs.writeFileSync(
  path.join(__dirname, 'src', 'lib', 'model_weights.json'), 
  JSON.stringify(modelWeights, null, 2)
);

console.log('Model weights saved successfully:', modelWeights);
