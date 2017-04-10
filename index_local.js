var Client = require('castv2-client').Client;
var DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
var mdns = require('mdns');
var ws = require('ws');

var CONFIG = require('./config.js');
var REMOTE_SERVER = CONFIG.REMOTE_SERVER;

var browser = mdns.createBrowser(mdns.tcp('googlecast'));
var socket = new ws('ws://' + REMOTE_SERVER + ':' + WS_PORT);

browser.on('serviceUp', function(service) {
  console.log('found device %s at %s:%d', service.name, service.addresses[0], service.port);

  var client = new Client();
  client.connect(service.addresses[0], function() {
    socket.on('message', function(data, flags) {
      console.log('received: ', data);
      client.launch(DefaultMediaReceiver, function(err, player) {
        var media = {
					contentId: 'http://' + CONFIG.REMOTE_SERVER + ":" + PORT + "/audio',
          contentType: 'audio/ogg',
          streamType: 'BUFFERED', // or LIVE
        };

        player.load(media, { autoplay: true }, function(err, status) {
          console.log('media loaded!');
        });
      });
    });
  });

  client.on('error', function(err) {
    console.log('client error: %s', err.message);
    client.close();
  });
});

browser.start();
