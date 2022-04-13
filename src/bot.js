const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const googleImages = require('google-images');

const config = require('./config');
const { tweetImg } = require('./tweet');

const images = new googleImages(
  config.googleAPI.cseID,
  config.googleAPI.apiKey
);

const msHour = 1000 * 60 * 60;

const descriptorsFilePath = path.join(__dirname, 'descriptors.txt');
const facesDirPath = path.join(__dirname, '../faces');
const tempImageFilePath = path.join(__dirname, '../temp/original.jpg');
const swappedFilePath = path.join(__dirname, '../temp/swapped.jpg');

// helper function to retrieve a random line from a text file
function getRandomLine(filename) {
  const data = fs.readFileSync(filename, 'utf8');
  const lines = data.toString().split('\n');
  return lines[Math.floor(Math.random() * lines.length)];
}

function makeTweet(numFaces) {
  // pick a random descriptor
  let desc = getRandomLine(descriptorsFilePath);
  desc = desc.replace(/^\w/, (c) => c.toUpperCase());
  console.log(`# Random descriptor chosen: ${desc}\n`);

  // find an image for the descriptor
  images.search(desc, { type: 'face', safe: 'high' }).then(
    (results) => {
      const attempt = 0;

      function tryImageResult(num) {
        function retryTweet(n) {
          if (n + 1 < results.length) tryImageResult(n + 1);
          else makeTweet();
        }

        const url = results[num]['url'];

        // make sure the image isn't an invalid type
        if (['gif', 'svg'].some((ext) => url.includes(`.${ext}`))) {
          retryTweet(num);
          return;
        }

        // download the file
        console.log(`Attempting to download image result #${num + 1}: ${url}`);
        const file = fs.createWriteStream(tempImageFilePath);

        function handleGet(response) {
          // pipe the response to the file
          response.pipe(file);

          // wait for the file to finish downloading
          file.on('finish', () => {
            // check if the file size is 'reasonable'
            const fileSize = fs.statSync(tempImageFilePath).size;
            console.log(`Image size in bytes: ${fileSize}`);

            if (fileSize >= 1000) {
              // attempt faceswap
              const spawn = require('child_process').spawn;

              const faceNum = Math.floor(Math.random() * numFaces) + 1;
              const faceImage = `/faces/${faceNum}.jpg`;

              const faceSwap = spawn('npm', [
                'run',
                'faceswap',
                '--',
                faceImage
              ]);

              faceSwap.stdout.on('data', (data) => {
                const dataStr = data.toString('utf8');
                console.log(dataStr);

                // check if the faceswap succeeded
                if (dataStr.includes('success')) {
                  console.log('Faceswap succeeded! :^)');
                  tweetImg(`${desc} Christian`, swappedFilePath);
                } else if (
                  dataStr.includes('No faces') ||
                  dataStr.includes('Too many faces')
                ) {
                  console.log('Failed to faceswap! ;(\n');
                  retryTweet(num);
                }
              });

              // handle errors
              faceSwap.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
              });
            } else {
              console.log('Failed to download file.\n');
              retryTweet(num);
            }
          });
        }

        // determine if we need to use HTTP or HTTPS to download the image
        if (url.substring(0, 8).localeCompare('https://') == 0) {
          https.get(url, handleGet);
        } else {
          http.get(url, handleGet);
        }
      }

      tryImageResult(attempt);
    },
    (err) => {
      console.log(err);
    }
  );
}

/*** Code to run ***/

console.log('Bot starting...\n');

// determine how many face pictures we have
const numFaces = fs.readdirSync(facesDirPath).length;
console.log(`Found ${numFaces} face image(s).`);

// make one tweet at startup
makeTweet(numFaces);

// tweet again every 3 hours
setInterval(makeTweet, msHour * 3);
