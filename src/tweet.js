const Twit = require('twit');

const config = require('./config');

const bot = new Twit(config.twitterKeys)

function tweetImg(text, imgPath) {
  bot.postMediaChunked({ file_path: imgPath }, (err, data) => {
    if (!err) {
      const params = { status: text, media_ids: data.media_id_string };

      bot.post('statuses/update', params, () => {
        console.log('Successfully tweeted with image. :)\n\n');
      });
    } else console.log(`Failed to upload IMG to Twitter:\n${err}\n`);
  });
}

module.exports = {
  tweetImg
};
