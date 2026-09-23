const fs = require('fs');
const path = require('path');
const { kmeans } = require('ml-kmeans');
const { RandomForestClassifier } = require('ml-random-forest');

const archivePath = 'C:\\Users\\tunas\\Downloads\\archive';
const files = fs.readdirSync(archivePath).filter(f => f.endsWith('.csv'));

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

  // We add slope energy and spike rate to give RF more to learn from
  const spikeThreshold = rms * 1.85;
  const spikeRate = centered.filter((value) => Math.abs(value) > spikeThreshold).length / values.length;
  const slopeEnergy = centered.slice(1).reduce((sum, value, index) => sum + Math.abs(value - centered[index]), 0) / values.length;

  return [rms, maxAbs, zeroCrossings, entropy, spikeRate, slopeEnergy];
}

console.log(`Processing ${files.length} files...`);

const datasetFeatures = [];
const validFiles = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(archivePath, file), 'utf8');
  const textSample = content.slice(0, 100000); // quick subset for memory
  const values = textSample.split(/[\s,;\n\r\t]+/).map(parseFloat).filter(Number.isFinite).slice(0, 5000);
  
  if (values.length > 10) {
    datasetFeatures.push(extractFeatures(values));
    validFiles.push(file);
  }
});

// Step 1: K-Means to assign labels (2 clusters: Normal vs Seizure)
// We assume 2 clusters. We'll identify the "Seizure" cluster as the one with higher average RMS or Entropy
console.log('Running K-Means to auto-label datasets...');
const kmeansResult = kmeans(datasetFeatures, 2, { initialization: 'kmeans++' });
let labels = kmeansResult.clusters;

// Determine which cluster is "Seizure"
let cluster0_rms = 0, cluster1_rms = 0;
let c0_count = 0, c1_count = 0;

labels.forEach((label, i) => {
  if (label === 0) { cluster0_rms += datasetFeatures[i][0]; c0_count++; }
  else { cluster1_rms += datasetFeatures[i][0]; c1_count++; }
});
cluster0_rms /= Math.max(1, c0_count);
cluster1_rms /= Math.max(1, c1_count);

// We want label 1 to be the high-variance (Seizure) cluster
if (cluster0_rms > cluster1_rms) {
  labels = labels.map(l => l === 0 ? 1 : 0);
}

console.log(`Auto-labeled: ${labels.filter(l => l === 0).length} Normal, ${labels.filter(l => l === 1).length} Seizure`);

// Step 2: Train Random Forest
console.log('Training Random Forest Classifier...');
const options = {
  seed: 42,
  maxFeatures: 1.0,
  replacement: true,
  nEstimators: 25
};
const rf = new RandomForestClassifier(options);
rf.train(datasetFeatures, labels);

// Step 3: Export Model JSON
console.log('Exporting Model...');
const modelJson = rf.toJSON();

// Also append K-Means centroids in case we need them
modelJson.clusterCentroids = kmeansResult.centroids;
modelJson.featureNames = ["rms", "maxAbs", "zeroCrossings", "entropy", "spikeRate", "slopeEnergy"];

fs.writeFileSync(
  path.join(__dirname, 'src', 'lib', 'rf_model.json'), 
  JSON.stringify(modelJson)
);

console.log('Random Forest model trained and saved to src/lib/rf_model.json');
