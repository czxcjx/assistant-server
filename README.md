Google Home Assistant Server
============================
A pair of servers (local and remote) for a couple of things in my Google Home setup. The local server communicates with the Google Home, while the remote server acts as an endpoint for IFTTT webhooks; the two servers stay in contact via a persistent WebSocket connection. Currently supports automatic search-and-play of music from Youtube.

Installation
============
1. Download youtube-dl ([https://rg3.github.io/youtube-dl/]) on the remote server.
2. Edit config.js (see config.js.sample) to include Youtube API key, remote server information, and youtube-dl directory
3. Run `npm install`.
4. Run `node server_remote.js` on remote server.
5. Run `node server_local.js` on local network.
