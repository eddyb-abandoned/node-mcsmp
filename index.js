exports.auth = require('./lib/auth');
exports.protocol = require('./lib/protocol');
exports.ClientSocket = require('./lib/ClientSocket').Socket;
var server = require('./lib/Server');
exports.Server = server.Server;
exports.createServer = server.createServer;
