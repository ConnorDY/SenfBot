const Twit = require("twit");
const config = require("../config");

const bot = new Twit(config.twitterKeys);

module.exports =
{
		tweetNow: function(text)
		{
			let tweet = {status: text};
		
			bot.post("statuses/update", tweet, (err, data, response) =>
			{
				if (err) console.log("ERROR Tweeting: "+err);
				else console.log("SUCCESS! Tweeted: "+text);
			});
		},
		tweetIMG: function(text, imgPath)
		{
			bot.postMediaChunked({file_path: imgPath}, (err, data, response) =>
			{
				if (!err)
				{
					var params = {status: text, media_ids: data.media_id_string};

					bot.post("statuses/update", params, (err, data, response) =>
					{
						console.log("Successfully tweeted with image. :)\n");
					})
				}
				else console.log("Failed to upload IMG to Twitter:\n"+err+"\n");
			});
		}
};