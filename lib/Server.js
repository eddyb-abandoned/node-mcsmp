
var assert = require('assert');
var auth = require('./auth');
var proto = require('./protocol');
var events = require('events');
var net = require('net');
var util = require('util');

function Server() {
    net.Server.call(this);
}

util.inherits(Server, net.Server);

Server.prototype.useAuth = false;
Server.prototype.protoVersion =  17; // Latest stable (1.8.1).

Server.prototype.on = function on(event, f) {
    if(event == 'connection')
        return net.Server.prototype.on.call(this, event, socket => f(new Socket(socket, this)));
    return net.Server.prototype.on.apply(this, arguments);
};

Server.prototype.listen = function listen(port, host, listeningListener) {
    return net.Server.prototype.listen.call(this, port || 25565, host, listeningListener);
};

exports.Server = Server;
exports.createServer = function createServer(connectionListener) {
    var server = new Server();
    if(connectionListener)
        server.on('connection', connectionListener);
    return server;
};

function Socket(sock, server) {
    events.EventEmitter.call(this);
    this.sock = sock;
    this.server = server;
    this.proto = proto[this.server.protoVersion];
    this.sock.on('error', this.emit.bind(this, 'error'));
    this.sock.on('close', this.emit.bind(this, 'close', 'Socket closed.'));
    this.sock.on('connect', () => {
        this.sock.on('data', this.processPackets.bind(this));
        this.on('close', () => {
            if(this.posEmitter)
                clearInterval(this.posEmitter);
            this.sock.end(proto.pack({type:proto.packets.DISCONNECT}, this.proto.server2client));
        });
    });
}

util.inherits(Socket, events.EventEmitter);

Socket.prototype.processPackets = function processPackets(data) {
    try {
        var start = 0;
        if(this.lastBuffer)
            data = concatBuffers(this.lastBuffer, data);
        while(start < data.length) {
            var packet = proto.unpack(data, start, this.proto.client2server);
            if(!packet) {
                this.lastBuffer = data.slice(start);
                return;
            }
            
            if(packet.type == proto.packets.HANDSHAKE) {
                this.username = packet.username;
                if(this.server.auth) {
                    this.hash = auth.genServerHash();
                    this.write(proto.packets.HANDSHAKE, {hash: this.hash});
                } else
                    this.write(proto.packets.HANDSHAKE, {hash: '-'});
            } else if(packet.type == proto.packets.LOGIN) {
                assert(packet.protoVersion == this.server.protoVersion);
                assert(packet.username == this.username);
                if(this.server.useAuth && this.hash)
                    auth.checkServer(this.username, this.hash, function(error) {
                        if(error)
                            this.emit('error', error);
                        else
                            this.emit('login', this.username);
                    });
                else
                    this.emit('login', this.username);
            }
            else if(packet.type == proto.packets.DISCONNECT)
                this.emit('close', packet.message);
            else
                this.emit('packet', packet);
            start += packet.length;
        }
        delete this.lastBuffer;
    } catch(e) {
        this.emit('error', e);
    }
};

Socket.prototype.write = function write(type, packet) {
    if(packet !== undefined)
        packet.type = type;
    else
        packet = type;
    this.sock.write(proto.pack(packet, this.proto.server2client));
};
