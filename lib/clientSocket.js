
var auth = require('./auth'), proto = require('./protocol'), events = require('events'), net = require('net'), util = require('util');

function concatBuffers(a, b) {
    var buffer = new Buffer(a.length + b.length);
    a.copy(buffer, 0, 0);
    b.copy(buffer, a.length, 0);
    return buffer;
}

function clientSocket() {
    events.EventEmitter.call(this);
}

util.inherits(clientSocket, events.EventEmitter);

clientSocket.prototype.connect = function connect(server, username, password, protoVersion, sessionID) {
    if(password !== undefined) {
        auth.login(username, password, function(username, sessionID) {this.connect(server, username, undefined, protoVersion, sessionID);}.bind(this), this.emit.bind(this, 'error'));
        return;
    }
    
    this.server = server;
    this.username = username;
    this.protoVersion = protoVersion;
    this.sessionID = sessionID;
    
    this.pos = {x:0, y:0, z:0, stance:1.6};
    
    this.sock = new net.Socket({type: 'tcp4'}); //net.createConnection(server[1] || 25565, server[0]);
    this.sock.on('error', this.emit.bind(this, 'error'));
    this.sock.on('close', this.emit.bind(this, 'close', 'Socket closed.'));
    this.sock.on('connect', function() {
        this.sock.on('data', this.processPackets.bind(this));
        this.on('close', function() {
            if(this.posEmitter)
                clearInterval(this.posEmitter);
            this.sock.end(proto.pack({type:proto.packets.DISCONNECT}));
        }.bind(this));
        this.write(proto.packets.HANDSHAKE, {username: username});
    }.bind(this));
    
    server = server.split(':');
    this.sock.connect(server[1] || 25565, server[0]);
};

clientSocket.prototype.processPackets = function processPackets(data) {
    try {
        var start = 0;
        if(this.lastBuffer)
            data = concatBuffers(this.lastBuffer, data);
        while(start < data.length) {
            var packet = proto.unpack(data, start, proto[this.protoVersion].server2client);
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
                    auth.joinServer(this.username, this.sessionID, packet.hash, this.write.bind(this, proto.packets.LOGIN, {protoVersion: this.protoVersion, username: this.username}), this.emit.bind(this, 'error'));
                }
            } else if(packet.type == proto.packets.LOGIN) {
                this.posEmitter = setInterval(function() {
                    this.write(proto.packets.PLAYER_POS, this.pos);
                }.bind(this), 20);
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

clientSocket.prototype.write = function write(type, packet) {
    if(packet !== undefined)
        packet.type = type;
    else
        packet = type;
    this.sock.write(proto.pack(packet, proto[this.protoVersion].client2server));
};

exports.clientSocket = clientSocket;
