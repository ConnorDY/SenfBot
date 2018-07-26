// listen on port so now.sh likes it
const https = require("https");
const http = require("http");

const Twit = require("twit");
const config = require("./config");

const bot = new Twit(config.twitterKeys);
const googleImages = require("google-images");
const images = new googleImages(config.googleAPI.cseID, config.googleAPI.apiKey);

const tweet = require("./api/tweet");
const path = require("path");
const fs = require("fs");

const swapScript = path.join(__dirname, "./api/faceswap.py");
const headImage = path.join(__dirname, "../image.jpg");
const numFaces = 8;

const msHour = 1000*60*60;

function getRandomLine(filename)
{
  var data = fs.readFileSync(filename, "utf8");
  var lines = data.toString().split("\n");
  return lines[Math.floor(Math.random()*lines.length)];
}

function makeTweet()
{
	// Pick a random Christian descriptor
	var desc = getRandomLine("./src/desc.txt");
	desc = desc.replace(/^\w/, c => c.toUpperCase());
	console.log("# Random descriptor chosen: "+desc+"\n");

	// Find an image for the descriptor
	var res = images.search(desc, {type: "face", safe: "high"});
	res.then((results) =>
	{
		var num = 0;

		function tryImageResult(num)
		{
			function retryTweet(n)
			{
				if (n+1 < results.length) tryImageResult(n+1);
				else makeTweet();
			}

			var url = results[num]["url"];

			if (url.includes(".gif"))
			{
				retryTweet(num);
				return;
			}

			// Download the file
			console.log("Attempting to download image result #"+(num+1)+": "+url);
			var file = fs.createWriteStream("./image.jpg");

			function handleGet(response)
			{
				// Pipe the response to the file
				response.pipe(file);

				// Wait for the file to finish downloading
				file.on("finish", () =>
				{
					// Check if the file size is 'reasonable'
					var fileSize = fs.statSync(path.join(__dirname, "../image.jpg")).size;
					console.log("Image size in bytes: "+fileSize);

					if (fileSize >= 1000)
					{
						// Attempt face-swap
						const spawn = require("child_process").spawn;
						const faceNum = Math.floor(Math.random() * numFaces)+1;
						const faceImage = path.join(__dirname, "../faces/"+faceNum+".jpg");
						const faceSwap = spawn("python", [swapScript, headImage, faceImage]);

						faceSwap.stdout.on("data", (data) =>
						{
							var dataStr = data.toString("utf8");
							var filePath = path.join(__dirname, "../image.jpg");

							// Check if faceswap succeeded
							if (dataStr.includes("success"))
							{
								filePath = path.join(__dirname, "../swapped.jpg");
								console.log("Faceswap succeeded! :^)");
								tweet.tweetIMG(desc+" Christian", filePath);
							}
							else
							{
								console.log("Failed to faceswap! ;(\n");
								retryTweet(num);
							}
						});
					}
					else
					{
						console.log("Failed to download file.\n");
						retryTweet(num);
					}
				});
			}

			// Determine if we need to use HTTP or HTTPS to download the image
			if (url.substr(0,8).localeCompare("https://") == 0) https.get(url, handleGet);
			else http.get(url, handleGet);
		}

		tryImageResult(num);
	}, (err) =>
	{
		console.log(err);
	});
}

/***
* Code to run
***/

console.log("Bot starting...\n");

// Run every 3 hours
makeTweet();
setInterval(makeTweet, msHour*3);
