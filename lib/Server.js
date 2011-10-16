
var auth = require('./auth'), proto = require('./protocol'), events = require('events'), net = require('net'), util = require('util');

function Server() {
    events.EventEmitter.call(this);
}

util.inherits(Server, events.EventEmitter);

