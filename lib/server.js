/**
 * Copyright Jeffrey Dungen 2017
 * https://github.com/jeffyactive/
 */

const barnowl = require('barnowl');
const hue = require('node-hue-api');
const config = require('./config');


var lights = [];
var beatUp = true;
var stats = [
  { peak: 0, peakId: null, peakTime: 0, avg: 0, samples: [], packets: 0,
    pps: 0 },
  { peak: 0, peakId: null, peakTime: 0, avg: 0, samples: [], packets: 0,
    pps: 0 }
]


// Listen on UART for reel, expecting two reelceivers
const middleware = new barnowl( { n: 2, enableMixing: false } );
middleware.bind(config.REEL_BIND_OPTIONS);


// Connect to bridge, query reachable lights and start the heartbeat
const bridge = new hue.HueApi(config.HUE_IP, config.HUE_USERNAME);
getLights(function(ids) {
  console.log('Connected to Hue bridge with', ids.length, 'reachable lights');
  for(var cId = 0; cId < ids.length; cId++) {
    lights.push( { id: ids[cId], idle: true } );
  }
  heartbeat(true);
});


// BLE packet decoded
middleware.on('visibilityEvent', function(tiraid) {
  if(!isReelyActive(tiraid)) {
    updateStats(tiraid.identifier.value, tiraid.radioDecodings);
  }
});


// Periodically aggregate stats
setInterval(function() {
  for(var cChannel = 0; cChannel < stats.length; cChannel++) {
    stats[cChannel].pps = 1000 * stats[cChannel].packets /
                          config.STATS_PERIOD_MILLISECONDS;
    stats[cChannel].packets = 0;
  }
}, config.STATS_PERIOD_MILLISECONDS);


// Complete one upward or downward transition of the heartbeat, set the next
function heartbeat(beatUp) {
  var bri;
  var transition = toTransition(stats[0].pps, stats[1].pps);

  if(beatUp) {
    bri = [ stats[0].peak, stats[1].peak ];
  }
  else {
    bri = [ stats[0].avg, stats[1].avg ];
  }

  var lightStates = [
    hue.lightState.create().bri(bri[0]).transition(transition - 20),
    hue.lightState.create().bri(bri[1]).transition(transition - 20)
  ];

  var handleError = function(err) {
    console.log('Hue error:', err.message);
  }

  bridge.setLightState(lights[0].id, lightStates[0].on())
        .then()
        .fail(handleError)
        .done();
  bridge.setLightState(lights[1].id, lightStates[1].on())
        .then()
        .fail(handleError)
        .done();

  setTimeout(heartbeat, transition, !beatUp);
}


// Update the decoding stats
function updateStats(id, radioDecodings) {
  var bri = [ 0, 0 ];
  var currentTime = new Date().getTime();

  for(var cDecoding = 0; cDecoding < radioDecodings.length; cDecoding++) {
    if(radioDecodings[cDecoding].identifier) {
      var receiverId = radioDecodings[cDecoding].identifier.value;
      if(receiverId === config.LEFT_REELCEIVER_ID) {
        bri[0] = toBri(radioDecodings[cDecoding].rssi);
      }
      else if(receiverId === config.RIGHT_REELCEIVER_ID) {
        bri[1] = toBri(radioDecodings[cDecoding].rssi);
      }
    }
  }

  for(var cChannel = 0; cChannel < stats.length; cChannel++) {
    if(bri[cChannel] > 0) {
      stats[cChannel].packets++;
    }

    if((bri[cChannel] >= stats[cChannel].peak) ||
       (id === stats[cChannel].peakId) ||
       ((currentTime - stats[cChannel].peakTime) >
        config.STATS_PERIOD_MILLISECONDS)) {
      stats[cChannel].peak = bri[cChannel];
      stats[cChannel].peakId = id;
      stats[cChannel].peakTime = currentTime;
    }

    stats[cChannel].samples.push(bri[cChannel]);
    if(stats[cChannel].samples.length > config.STATS_SAMPLES) {
      stats[cChannel].samples.shift();
    }
    var sum = 0;
    for(var cSample = 0; cSample < stats[cChannel].samples.length; cSample++) {
      sum += stats[cChannel].samples[cSample];
    }
    stats[cChannel].avg = Math.round(sum / stats[cChannel].samples.length);
  }
}


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


// Convert RSSI to brightness
function toBri(rssi) {
  return Math.max(0, Math.floor(255 * (rssi - config.MIN_RSSI) /
                                (config.MAX_RSSI - config.MIN_RSSI)));
}


// Convert packets-per-second to transition time
function toTransition(pps0, pps1) {
  var pps = Math.max(pps0, pps1);
  var divisor = Math.max(1, Math.log(pps));
  return Math.round(config.HEART_BASE_MILLISECONDS / divisor);
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
