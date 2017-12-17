/**
 * Copyright Jeffrey Dungen 2017
 * https://github.com/jeffyactive/
 */

const hue = require('node-hue-api');
const config = require('./config');


const hueApi = new hue.HueApi();


findHueBridges(function(success, ip) {
  if(!success) { return; }
  console.log('*** Press the button on the Hue bridge immediately ***');
  setTimeout(function() {
    connectToBridge(ip, function(success) { });
  }, 4000);
});


// Find Hue bridges using upnpSearch search on the local network
function findHueBridges(callback) {
  console.log('Starting search for Hue bridges, this will take',
              config.HUE_SEARCH_MILLISECONDS, 'ms');

  hue.upnpSearch(config.HUE_SEARCH_MILLISECONDS)
    .then(function(bridges) {
      if(bridges.length === 0) {
        console.log('No Hue bridges were found.');
        console.log('-> check connections and run this program again');
        callback(false);
      }
      else if(bridges.length === 1) {
        console.log('Found a Hue bridge at', bridges[0].ipaddress);
        callback(true, bridges[0].ipaddress);
      }
      else {
        console.log('Found Hue bridges at the following IP addresses:');
        for(var cBridge = 0; cBridge < bridges.length; cBridge++) {
          console.log('  ', bridges[cBridge].ipaddress);
        }
        console.log('-> remove extra bridges and run this program again');
        callback(false);
      }
    })
    .done();
}


// Connect to the Hue bridge at the given IP address
function connectToBridge(ip, callback) {

  hueApi.registerUser(ip, 'presences-peripheriques')
    .then(function(username) {
      console.log('Connection to bridge successful');
      console.log('-> enter', username, 'as HUE_USERNAME in config.js');
      callback(true);
    })
    .fail(function(err) {
      console.log('Unable to establish connection with bridge, did you press the button in time?');
      console.log('-> run this program again');
      callback(false);
    })
    .done();
}
