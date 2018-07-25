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
	console.log("Random descriptor chosen: "+desc);

	// Find an image for the descriptor
	var res = images.search(desc, {size: "medium", safe: "high"});
	res.then((results) =>
	{
		var url = results[0]["url"];

		// Download the file
		console.log("Attempting to download file: "+url);
		var file = fs.createWriteStream("./image.jpg");

		function handleGet(response)
		{
			// Pipe the response to the file
			response.pipe(file);

			// Wait for the file to finish downloading
			file.on("finish", () =>
			{
				// Check if the file size is zero
				var fileSize = fs.statSync(path.join(__dirname, "../image.jpg")).size;
				console.log("Image size in bytes: "+fileSize);
				if (fileSize > 0)
				{
					// Tweet it!
					var filePath = path.join(__dirname, "../image.jpg");
					tweet.tweetIMG(desc+" Christian", filePath);
				}
				else
				{
					console.log("Failed to download file. Retrying...\n");
					makeTweet();
				}
			});
		}

		// Determine if we need to use HTTP or HTTPS to download the image
		if (url.substr(0,8).localeCompare("https://") == 0) https.get(url, handleGet);
		else http.get(url, handleGet);
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
