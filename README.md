Google Home Assistant Server
============================
A pair of servers (local and remote) for a couple of things in my Google Home setup. The local server communicates with the Google Home, while the remote server acts as an endpoint for IFTTT webhooks; the two servers stay in contact via a persistent WebSocket connection. Currently supports automatic search-and-play of music from Youtube.

Installation
============
1. Edit private_config.js to include Youtube API key and remote server information
2. Run `npm install`.
3. Run `node server_remote.js` on remote server
4. Run `node server_local.js` on local network
