/**
 * Copyright Jeffrey Dungen 2017
 * https://github.com/jeffyactive/
 */

const REEL_BIND_OPTIONS = { protocol: 'serial', path: '/dev/serial0' };
const LEFT_REELCEIVER_ID = '001bc50940810000';
const RIGHT_REELCEIVER_ID = '001bc50940810000';
const HUE_IP = '10.0.50.60';
const HUE_USERNAME = '';
const HUE_SEARCH_MILLISECONDS = 8000;
const HUE_PULSE_MILLISECONDS = 240;  // Less than 240ms may overwhelm bridge
const MAX_RSSI = 193;
const MIN_RSSI = 160;


module.exports.REEL_BIND_OPTIONS = REEL_BIND_OPTIONS;
module.exports.LEFT_REELCEIVER_ID = LEFT_REELCEIVER_ID;
module.exports.RIGHT_REELCEIVER_ID = RIGHT_REELCEIVER_ID;
module.exports.HUE_IP = HUE_IP;
module.exports.HUE_USERNAME = HUE_USERNAME;
module.exports.HUE_SEARCH_MILLISECONDS = HUE_SEARCH_MILLISECONDS;
module.exports.HUE_PULSE_MILLISECONDS = HUE_PULSE_MILLISECONDS;
module.exports.MAX_RSSI = MAX_RSSI;
module.exports.MIN_RSSI = MIN_RSSI;
