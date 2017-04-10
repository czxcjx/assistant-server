var execFile = require('child_process').execFile;
var express = require('express');
var fs = require('fs');
var googleapis = require('googleapis');
var ws = require('ws');

var CONFIG = require('./config.js');

var app = express();
var youtube = googleapis.youtube({ version: 'v3', auth: CONFIG.API_KEY });
var websocketServer = new ws.Server({ port: CONFIG.WS_PORT });

app.get('/', function(req, res) {
  res.send('Hello world!');
});

// Get downloaded audio
app.get('/audio', function(req, res) {
  res.set({'Content-Type': 'audio/ogg'});
  var readStream = fs.createReadStream('./audio.opus');
  readStream.pipe(res);
});

// Find new audio and download it
app.get('/find_song', function(req, res) {
  if (req.query && req.query.search) {
    console.log('Requested: ' + req.query.search);
  }
  res.send('OK');
  var ytRequest = youtube.search.list(
    {
      q: req.query.search,
      part: 'snippet',
      type: 'video',
      maxResults: 1,
    }, 
    function (err, res) { 
      if (err) {
        console.log('ERROR: ', err);
        return;
      }
      var id = res.items[0].id.videoId;
      console.log('ID:', id);

      fs.unlinkSync('./audio.opus');

      execFile(
        '/usr/bin/python',
        [
          CONFIG.YOUTUBE_DL_DIR + '/youtube-dl',
          'https://youtube.com/watch?v=' + id,
          '-x',
          '-o',
          './audio.opus',
          '--audio-format',
          'opus',
        ],
        function(err, stdout, stderr) {
          websocketServer.clients.forEach(function(client) {
            if (client.readyState === ws.OPEN) {
              client.send('UPDATE');
            }
          });
        }
      );
    }
  );
});

app.listen(CONFIG.PORT, 'localhost', function() {
  console.log('Listening on port %d', CONFIG.PORT);
});
