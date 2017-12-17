/**
 * Copyright Jeffrey Dungen 2017
 * https://github.com/jeffyactive/
 */

const barnowl = require('barnowl');
const hue = require('node-hue-api');
const config = require('./config');


var lights = [];


// Listen on UART for reel, expecting two reelceivers
const middleware = new barnowl( { n: 2, enableMixing: false } );
middleware.bind(config.REEL_BIND_OPTIONS);


// Connect to bridge and query reachable lights
const bridge = new hue.HueApi(config.HUE_IP, config.HUE_USERNAME);
getLights(function(ids) {
  console.log('Connected to Hue bridge with', ids.length, 'reachable lights');
  for(var cId = 0; cId < ids.length; cId++) {
    lights.push( { id: ids[cId], idle: true } );
  }
});


// BLE packet decoded
middleware.on('visibilityEvent', function(tiraid) {
  if(!isReelyActive(tiraid)) {
    var state = convertToLightState(tiraid);

    if(lights[0] && lights[0].idle && lights[1] && lights[1].idle) {
      setLightState(0, state[0]);
      setLightState(1, state[1]);
    }
  }
});


// Deterimine if the decoded transmission is from reelyActive infrastructure
function isReelyActive(tiraid) {
  if(tiraid.hasOwnProperty('identifier') &&
     tiraid.identifier.hasOwnProperty('advData') &&
     tiraid.identifier.advData.hasOwnProperty('complete128BitUUIDs') &&
     (tiraid.identifier.advData.complete128BitUUIDs === 
                                        '7265656c794163746976652055554944')) {
    return true;
  }
  return false;
}


// Convert the decoding into a stereo light state
function convertToLightState(tiraid) {
  var state = [ { bri: 0, offDelay: 100 }, { bri: 0, offDelay: 100 } ];

  for(var cDecoding = 0; cDecoding < tiraid.radioDecodings.length;
      cDecoding++) {
    if(tiraid.radioDecodings[cDecoding].hasOwnProperty('identifier')) {
      var receiverId = tiraid.radioDecodings[cDecoding].identifier.value;
      if(receiverId === config.LEFT_REELCEIVER_ID) {
        state[0].bri = toBri(tiraid.radioDecodings[cDecoding].rssi);
      }
      else if(receiverId === config.RIGHT_REELCEIVER_ID) {
        state[1].bri = toBri(tiraid.radioDecodings[cDecoding].rssi);
      }
    }
  }

  return state;
}


// Convert RSSI to brightness
function toBri(rssi) {
  return Math.floor(255 * (rssi - config.MIN_RSSI) /
                          (config.MAX_RSSI - config.MIN_RSSI));
}


// Query the bridge for the IDs of all reachable lights
function getLights(callback) {
  bridge.lights()
    .then(function(lights) {
      var lightIds = [];
      for(var cLight = 0; cLight < lights.lights.length; cLight++) {
        var light = lights.lights[cLight];
        if(light.state.reachable) {
          lightIds.push(light.id);
        }
      }
      return callback(lightIds);
    })
    .fail(function(err) {
      console.log('Error: no reachable lights!', err);
      return callback([]);
    })
    .done();
};


// Set the state of the given light
function setLightState(index, state) {

  if((index >= lights.length) || !lights[index].idle) {
    return;
  }

  var makeIdle = function() {
    lights[index].idle = true;
  }

  var handleError = function(err) {
    console.log('Hue error:', err.message);
    makeIdle();
  }

  var delayedOff = function() {
    setTimeout(function() {
      bridge.setLightState(lights[index].id, lightState.off())
            .then(makeIdle)
            .fail(handleError)
            .done();
    }, state.offDelay);
  }

  var lightState = hue.lightState.create().bri(state.bri)
                                          .transition(state.transition || 0);
  lights[index].idle = false;
  bridge.setLightState(lights[index].id, lightState.on())
        .then(delayedOff)
        .fail(handleError)
        .done();
}
