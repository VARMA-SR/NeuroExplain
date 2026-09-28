const fs = require('fs');
const { RandomForestClassifier } = require('ml-random-forest');
const rfModelData = require('./src/lib/rf_model.json');

function generateSimulatedData(type) {
  let values = [];
  for (let i = 0; i < 2560; i++) {
      let frontal = Math.sin(i * 0.05) * 12 + Math.sin(i * 0.01) * 5 + (Math.random() - 0.5) * 4;
      if (type === "Seizure" && i > 1024 && i < 1792) {
          frontal += Math.sin(i * 0.15) * 150 + (Math.random() - 0.5) * 20;
      } else if (type === "Moderate" && i % 200 > 150) {
          frontal += Math.sin(i * 0.3) * 60;
      }
      values.push(frontal);
  }
  return values;
}

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

  const spikeThreshold = rms * 1.85;
  const spikeRate = centered.filter((value) => Math.abs(value) > spikeThreshold).length / values.length;
  const slopeEnergy = centered.slice(1).reduce((sum, value, index) => sum + Math.abs(value - centered[index]), 0) / values.length;

  return [rms, maxAbs, zeroCrossings, entropy, spikeRate, slopeEnergy];
}

const modValues = generateSimulatedData("Moderate");
const modFeatures = extractFeatures(modValues);
console.log("Moderate features:", modFeatures);
