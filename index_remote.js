var execFile = require('child_process').execFile;
var express = require('express');
var fs = require('fs');
var googleapis = require('googleapis');
var ws = require('ws');

var CONFIG = require('./config.js');

var app = express();
var youtube = googleapis.youtube({ version: 'v3', auth: CONFIG.API_KEY });
var websocketServer = new ws.Server({ port: CONFIG.WS_PORT });

// Do we automatically load a new song when the current one ends?
var autoplayNextSong = true;
// Set of songs played in this autoplay set
var autoplayedSongs = {};
// Number of songs to request on autoplay list (to find new song)
var MAX_AUTOPLAY_RESULTS = 10;
// Last played song id
var lastId = '';

app.get('/', function(req, res) {
  res.send('Hello world!');
});

// Get downloaded audio
app.get('/audio', function(req, res) {
  res.set({'Content-Type': 'audio/ogg'});
  try {
    var readStream = fs.createReadStream('./audio.opus');
    readStream.pipe(res);
  } catch (fs_err) {
    if (fs_err.code !== 'ENOENT') {
      throw fs_err;
    } else {
      res.end();
    }
  }
});

function loadYoutubeVideo(id) {
  try {
    fs.unlinkSync('./audio.opus');
  } catch (fs_err) {
    if (fs_err.code !== 'ENOENT') {
      throw fs_err;
    }
  }

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
      lastId = id;
      autoplayedSongs[id] = true;
      websocketServer.clients.forEach(function(client) {
        if (client.readyState === ws.OPEN) {
          client.send('UPDATE');
        }
      });
    }
  );
}

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

      autoplayedSongs = {};
      loadYoutubeVideo(id);
    }
  );
});

// Handle autoplay
app.get('/autoplay', function(req, res) {
  if (req.query && req.query.val) {
    console.log('Setting autoplay to %s', req.query.val);
  }
  res.send('OK');
  autoplayNextSong = (req.query.val === 'true') ? true : false;
});
websocketServer.on('connection', function(socket) {
  socket.on('message', function(msg) {
    if (msg === 'SONG_ENDED' && autoplayNextSong) {
      var ytRequest = youtube.search.list(
        {
          relatedToVideoId: lastId,
          part: 'snippet',
          type: 'video',
          maxResults: MAX_AUTOPLAY_RESULTS,
        }, 
        function (err, res) {
          if (err) {
            console.log('ERROR: ', err);
            return;
          }
          var id = '';
          for (var i = 0; i < MAX_AUTOPLAY_RESULTS; i++) {
            if (autoplayedSongs[res.items[i].id.videoId] === undefined) {
              id = res.items[i].id.videoId;
              break;
            }
          }
          if (id === '') {
            id = res.items[0].id.videoId;
          }
          console.log('AUTO_ID:', id);

          loadYoutubeVideo(id);
        }
      );

    }
  });
});

app.listen(CONFIG.PORT, function() {
  console.log('Listening on port %d', CONFIG.PORT);
});
