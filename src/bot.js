const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const googleImages = require('google-images');

const tweet = require('./api/tweet');
const config = require('./config');

const images = new googleImages(
  config.googleAPI.cseID,
  config.googleAPI.apiKey
);

const numFaces = 20;
const msHour = 1000 * 60 * 60;

function getRandomLine(filename) {
  const data = fs.readFileSync(filename, 'utf8');
  const lines = data.toString().split('\n');
  return lines[Math.floor(Math.random() * lines.length)];
}

function makeTweet() {
  // Pick a random Christian descriptor
  let desc = getRandomLine('./src/desc.txt');
  desc = desc.replace(/^\w/, (c) => c.toUpperCase());
  console.log(`# Random descriptor chosen: ${desc}\n`);

  // Find an image for the descriptor
  images.search(desc, { type: 'face', safe: 'high' }).then(
    (results) => {
      const attempt = 0;

      function tryImageResult(num) {
        function retryTweet(n) {
          if (n + 1 < results.length) tryImageResult(n + 1);
          else makeTweet();
        }

        const url = results[num]['url'];

        // Make sure the image isn't an invalid type
        if (['gif', 'svg'].some((ext) => url.includes(`.${ext}`))) {
          retryTweet(num);
          return;
        }

        // Download the file
        console.log(`Attempting to download image result #${num + 1}: ${url}`);
        var file = fs.createWriteStream('./image.jpg');

        function handleGet(response) {
          // Pipe the response to the file
          response.pipe(file);

          // Wait for the file to finish downloading
          file.on('finish', () => {
            // Check if the file size is 'reasonable'
            const fileSize = fs.statSync(path.join(__dirname, '../image.jpg'))
              .size;
            console.log(`Image size in bytes: ${fileSize}`);

            if (fileSize >= 1000) {
              // Attempt face-swap
              const spawn = require('child_process').spawn;
              const faceNum = Math.floor(Math.random() * numFaces) + 1;
              const faceImage = `/app/faces/${faceNum}.jpg`;
              const faceSwap = spawn('npm', [
                'run',
                'faceswap',
                '--',
                faceImage
              ]);

              faceSwap.stdout.on('data', (data) => {
                const dataStr = data.toString('utf8');
                console.log(dataStr);

                // Check if faceswap succeeded
                if (dataStr.includes('success')) {
                  const filePath = path.join(__dirname, '../swapped.jpg');
                  console.log('Faceswap succeeded! :^)');
                  tweet.tweetIMG(`${desc} Christian`, filePath);
                } else if (dataStr.includes('No faces')) {
                  console.log('Failed to faceswap! ;(\n');
                  retryTweet(num);
                }
              });

              faceSwap.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
              });
            } else {
              console.log('Failed to download file.\n');
              retryTweet(num);
            }
          });
        }

        // Determine if we need to use HTTP or HTTPS to download the image
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

/***
 * Code to run
 ***/

console.log('Bot starting...\n');

// Run every 3 hours
makeTweet();
setInterval(makeTweet, msHour * 3);
