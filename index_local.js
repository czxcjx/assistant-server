var Client = require('castv2-client').Client;
var DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
var mdns = require('mdns');
var ws = require('ws');

var CONFIG = require('./config.js');

// Fix from https://github.com/agnat/node_mdns/issues/130#issuecomment-120731155
var resolverSequence = [
  mdns.rst.DNSServiceResolve(),
  'DNSServiceGetAddrInfo' in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({families: [4]}),
  mdns.rst.makeAddressesUnique(),
];
var browser = mdns.createBrowser(mdns.tcp('googlecast'), { resolverSequence: resolverSequence });
var socket = new ws('ws://' + CONFIG.REMOTE_SERVER + ':' + CONFIG.WS_PORT);

browser.on('serviceUp', function(service) {
  console.log('found device %s at %s:%d', service.name, service.addresses[0], service.port);

  var client = new Client();
  client.connect(service.addresses[0], function() {
    socket.on('message', function(data, flags) {
      console.log('received: ', data);
      client.launch(DefaultMediaReceiver, function(err, player) {
        var media = {
          contentId: 'http://' + CONFIG.REMOTE_SERVER + ':' + CONFIG.PORT + '/audio',
          contentType: 'audio/ogg',
          streamType: 'BUFFERED', // or LIVE
        };

        player.load(media, { autoplay: true }, function(err, status) {
          console.log('media loaded!');
        });

        // Handle autoplay
        player.on('status', function(status) {
          console.dir(status);
          console.log(status.playerState, status.idleReason);
          if (status.playerState === 'IDLE' && status.idleReason === 'FINISHED') {
            console.log('song ended');
            socket.send('SONG_ENDED');
          }
        });
      });
    });
  });

  client.on('error', function(err) {
    console.log('client error: %s', err.message);
    client.close();
  });
});

browser.on('error', function(err) {
  console.log('browser error: %s', err);
});

try {
  browser.start();
} catch (err) {
  console.log('caught: %s', err);
}
