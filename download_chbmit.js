const https = require('https');
const fs = require('fs');
const path = require('path');

const datasetsDir = path.join(__dirname, 'datasets');
if (!fs.existsSync(datasetsDir)) {
    fs.mkdirSync(datasetsDir);
}

// Download a small sample from CHB-MIT (PhysioNet)
// chb01_03.edf contains a seizure for patient 01
const fileUrl = 'https://physionet.org/files/chbmit/1.0.0/chb01/chb01_03.edf?download';
const targetPath = path.join(datasetsDir, 'chb01_03_seizure.edf');

console.log('Downloading CHB-MIT sample data...');

https.get(fileUrl, (response) => {
    if (response.statusCode === 200) {
        const file = fs.createWriteStream(targetPath);
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`Successfully downloaded dataset to ${targetPath}`);
        });
    } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (res2) => {
            const file = fs.createWriteStream(targetPath);
            res2.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Successfully downloaded dataset via redirect to ${targetPath}`);
            });
        });
    } else {
        console.error(`Failed to download: ${response.statusCode}`);
    }
}).on('error', (err) => {
    console.error('Error downloading file:', err.message);
});
