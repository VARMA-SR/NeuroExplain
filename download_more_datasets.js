const https = require('https');
const fs = require('fs');
const path = require('path');

const datasetsDir = path.join(__dirname, 'datasets');
if (!fs.existsSync(datasetsDir)) {
    fs.mkdirSync(datasetsDir);
}

const filesToDownload = [
    {
        name: 'Patient_1_Normal_chb01_01.edf',
        url: 'https://physionet.org/files/chbmit/1.0.0/chb01/chb01_01.edf?download',
        desc: 'Normal baseline EEG without seizures.'
    },
    {
        name: 'Patient_1_Seizure_chb01_04.edf',
        url: 'https://physionet.org/files/chbmit/1.0.0/chb01/chb01_04.edf?download',
        desc: 'EEG containing a seizure event from Patient 1.'
    },
    {
        name: 'Patient_2_Seizure_chb02_16.edf',
        url: 'https://physionet.org/files/chbmit/1.0.0/chb02/chb02_16.edf?download',
        desc: 'EEG containing a seizure event from Patient 2.'
    }
];

function downloadFile(fileObj) {
    return new Promise((resolve, reject) => {
        const targetPath = path.join(datasetsDir, fileObj.name);
        console.log(`Downloading ${fileObj.name}...`);
        
        const request = https.get(fileObj.url, (response) => {
            if (response.statusCode === 200) {
                const file = fs.createWriteStream(targetPath);
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`✓ Successfully downloaded: ${fileObj.name}`);
                    resolve();
                });
            } else if (response.statusCode === 302 || response.statusCode === 301) {
                // Redirect
                https.get(response.headers.location, (res2) => {
                    const file = fs.createWriteStream(targetPath);
                    res2.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`✓ Successfully downloaded: ${fileObj.name}`);
                        resolve();
                    });
                }).on('error', reject);
            } else {
                reject(new Error(`Failed with status code: ${response.statusCode}`));
            }
        }).on('error', reject);
    });
}

async function downloadAll() {
    console.log("Starting dataset downloads from PhysioNet...\n");
    for (const file of filesToDownload) {
        try {
            await downloadFile(file);
        } catch (e) {
            console.error(`X Failed to download ${file.name}:`, e.message);
        }
    }
    console.log("\nAll downloads complete!");
}

downloadAll();
