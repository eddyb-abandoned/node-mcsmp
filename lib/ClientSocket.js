
var auth = require('./auth');
var proto = require('./protocol');
var events = require('events');
var net = require('net');
var util = require('util');

function concatBuffers(a, b) {
    var buffer = new Buffer(a.length + b.length);
    a.copy(buffer, 0, 0);
    b.copy(buffer, a.length, 0);
    return buffer;
}

function Socket() {
    events.EventEmitter.call(this);
}

util.inherits(Socket, events.EventEmitter);

Socket.prototype.connect = function connect(server, username, password, protoVersion, sessionID) {
    if(password !== undefined) {
        auth.login(username, password, (error, username, sessionID) => {
            if(error)
                this.emit('error', error);
            else
                this.connect(server, username, undefined, protoVersion, sessionID);
        });
        return;
    }
    
    this.server = server;
    this.username = username;
    this.protoVersion = protoVersion || 17; // Latest stable (1.8.1).
    this.proto = proto[this.protoVersion];
    this.sessionID = sessionID;
    
    this.pos = {x:0, y:0, z:0, stance:1.6};
    
    this.sock = new net.Socket({type: 'tcp4'});
    this.sock.on('error', this.emit.bind(this, 'error'));
    this.sock.on('close', this.emit.bind(this, 'close', 'Socket closed.'));
    this.sock.on('connect', () => {
        this.sock.on('data', this.processPackets.bind(this));
        this.on('close', () => {
            if(this.posEmitter)
                clearInterval(this.posEmitter);
            this.sock.end(proto.pack({type:proto.packets.DISCONNECT}, this.proto.client2server));
        });
        this.write(proto.packets.HANDSHAKE, {username});
    });
    
    server = server.split(':');
    this.sock.connect(server[1] || 25565, server[0]);
};

Socket.prototype.processPackets = function processPackets(data) {
    try {
        var start = 0;
        if(this.lastBuffer)
            data = concatBuffers(this.lastBuffer, data);
        while(start < data.length) {
            var packet = proto.unpack(data, start, this.proto.server2client);
            if(!packet) {
                this.lastBuffer = data.slice(start);
                return;
            }
            
            if(packet.type == proto.packets.KEEPALIVE)
                this.write(packet);
            else if(packet.type == proto.packets.HANDSHAKE) {
                if(packet.hash == '-')
                    this.write(proto.packets.LOGIN, {protoVersion: this.protoVersion, username: this.username});
                else {
                    if(!this.sessionID) {
                        this.emit('error', 'Server requires authentication');
                        return;
                    }
                    auth.joinServer(this.username, this.sessionID, packet.hash, error => {
                        if(error)
                            this.emit('error', error);
                        else
                            this.write(proto.packets.LOGIN, {protoVersion: this.protoVersion, username: this.username});
                    });
                }
            } else if(packet.type == proto.packets.LOGIN) {
                this.posEmitter = setInterval(() => {
                    this.write(proto.packets.PLAYER_POS, this.pos);
                }, 20);
                this.emit('packet', packet);
            }
            else if(packet.type == proto.packets.DISCONNECT)
                this.emit('close', packet.message);
            else if(packet.type == proto.packets.PLAYER_POS || packet.type == proto.packets.PLAYER_POS_LOOK) {
                var c = false;
                if(this.pos.x !== packet.x)
                    this.pos.x = packet.x, c = true;
                if(this.pos.y !== packet.y)
                    this.pos.y = packet.y, c = true;
                if(this.pos.z !== packet.z)
                    this.pos.z = packet.z, c = true;
                if(this.pos.stance !== packet.stance)
                    this.pos.stance = packet.stance, c = true;
                if(c)
                    this.emit('position', this.pos);
            } else
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
    this.sock.write(proto.pack(packet, this.proto.client2server));
};

exports.Socket = Socket;
