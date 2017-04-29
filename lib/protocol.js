var assert = require('assert');
var deflate = require('deflate');

((() => {
    var ev = '';
    'byte ubyte short int long float double str8 str16 bool mobMetadata optionalItem itemList compressedChunk multiBlock'.split(' ').forEach(type => {
        ev += 'var '+type+' = function '+type+'(n){return ["'+type+'",n||"~"];};';
    });
    eval(ev);
    
    exports.client2server = {
        0x00: [int('id')],
        0x01: [int('protoVersion'), str16('username'), long(/*seed*/), int(/*mode*/), byte(/*world*/), byte(), ubyte(/*height*/), ubyte(/*maxPlayers*/)],
        0x02: [str16('username')],
        0x03: [str16('message')],
        0x05: [int('EID'), short('slot'), short('itemID'), short('dataValue')],
        0x07: [int('playerEID'), int('targetEID'), bool('leftClick')],
        0x09: [byte('world'), byte(), byte('mode'), short('height'), long('seed')],
 
        0x0a: [bool('onGround')],
        0x0b: [double('x'), double('y'), double('stance'), double('z'), bool('onGround')],
        0x0c: [float('yaw'), float('pitch'), bool('onGround')],
        0x0d: [double('x'), double('y'), double('stance'), double('z'), float('yaw'), float('pitch'), bool('onGround')],
 
        0x0e: [byte('status'), int('x'), byte('y'), int('z'), byte('face')],
        0x0f: [int('x'), byte('y'), int('z'), byte('direction'), short('itemID'), byte('count'), short('dataValue')],
        0x10: [short('slot')],
        0x12: [int('EID'), byte('animation')],
        0x13: [int('EID'), byte('action')],
        0x15: [int('EID'), short('item'), byte('count'), short('dataValue'), int('x'), int('y'), int('z'), byte('yaw'), byte('pitch'), byte('roll')],
        
        0x1c: [int('EID'), short('vx'), short('vy'), short('vz')],
 
        0x65: [byte('windowID')],
        0x66: [byte('windowID'), short('slot'), bool('rightClick'), short('actionID'), bool('shift'), short('itemID'), byte('itemCount'), short('itemDataValue')],
        0x6a: [byte('windowID'), short('actionID'), bool('accepted')],
        0x82: [int('x'), short('y'), int('z'), str16('line1'), str16('line2'), str16('line3'), str16('line4')],
 
        0xfe: [],
        0xff: [str16('message')],
    };
    
    exports.server2client = {
        0x00: [int('id')],
        0x01: [int('playerEID'), str16(), long('seed'), int('mode'), byte('world'), byte('unk'), ubyte('height'), ubyte('maxPlayers')],
        0x02: [str16('hash')],
        0x03: [str16('message')],
        0x04: [long('time')],
        0x05: [int('entityID'), short('slot'), short('itemID'), short('dataVal')],
        0x06: [int('x'), int('y'), int('z')],
        0x08: [short('health'), short('food'), float('foodSaturation')],
        0x09: [byte('world'), byte(), byte('mode'), short('height'), long('seed')],
 
        0x0b: [double('x'), double('stance'), double('y'), double('z'), bool('onGround')],
        0x0d: [double('x'), double('stance'), double('y'), double('z'), float('yaw'), float('pitch'), bool('onGround')],
        
        0x0e: [byte('status'), int('x'), byte('y'), int('z'), byte('face')],
        0x0f: [int('x'), byte('y'), int('z'), byte('direction'), short('itemID'), byte('count'), short('dataValue')],
        0x10: [int('uid'), short('item')],
        0x11: [int('EID'), byte(), int('x'), byte('y'), int('z')],
        0x12: [int('EID'), byte('animation')],
 
        0x14: [int('EID'), str16('playerName'), int('x'), int('y'), int('z'), byte('yaw'), byte('pitch'), short('itemHolding')],
        0x15: [int('EID'), short('item'), byte('count'), short('dataValue'), int('x'), int('y'), int('z'), byte('yaw'), byte('pitch'), byte('roll')],

        0x16: [int('collectedID'), int('collectorID')],
        0x17: [int('EID'), byte('objType'), int('x'), int('y'), int('z'), int(), short(), short(), short()],
        0x18: [int('EID'), byte('mobType'), int('x'), int('y'), int('z'), byte('rotation'), byte('pitch'), mobMetadata('metadata')],
        0x19: [int('EID'), str16('title'), int('x'), int('y'), int('z'), int('direction')],
        0x1a: [int('EID'), int('x'), int('y'), int('z'), short('count')],
        0x1c: [int('EID'), short('vx'), short('vy'), short('vz')],
        0x1d: [int('EID')],
        0x1e: [int('EID')],
        0x1f: [int('EID'), byte('x'), byte('y'), byte('z')],
        0x20: [int('EID'), byte('yaw'), byte('pitch')],
        0x21: [int('EID'), byte('x'), byte('y'), byte('z'), byte('yaw'), byte('pitch')],
        0x22: [int('EID'), int('x'), int('y'), int('z'), byte('yaw'), byte('pitch')],
        0x26: [int('EID'), byte('status')],
        0x27: [int('EID'), int('vehicleID')],
        0x28: [int('EID'), mobMetadata('metadata')],
        0x2b: [byte('experience'), byte('level'), short('totalExperience')],
 
        0x32: [int('x'), int('z'), bool('load')],
        0x33: [int('x'), short('y'), int('z'), byte('sizeX'), byte('sizeY'), byte('sizeZ'), compressedChunk('chunk')],
        0x34: [int('x'), int('z'), multiBlock('blocks')],
        0x35: [int('x'), byte('y'), int('z'), byte('blockType'), byte('blockDataValue')],
        0x36: [int('x'), short('y'), int('z'), byte('a'), byte('b')],
        0x3c: [double('x'), double('y'), double('z'), float('radius'), int('count'), /* explosion block array */],
        0x3d: [int('effectID'), int('x'), byte('y'), int('z'), int('data')],

        0x46: [byte('reason'), byte('gameMode')],
        0x47: [int('EID'), bool(), int('x'), int('y'), int('z')],
 
        0x64: [byte('windowID'), byte('inventoryType'), str16('title'), byte('slots')],
        0x65: [byte('windowID')],
        0x67: [byte('windowID'), short('slot'), optionalItem('item')],
        0x68: [byte('windowID'), itemList('items')],
        0x69: [byte('windowID'), short('progressBar'), short('value')],
        0x6a: [byte('windowID'), short('actionID'), bool('accepted')],
        0x82: [int('x'), short('y'), int('z'), str16('line1'), str16('line2'), str16('line3'), str16('line4')],

        0x83: [short('itemType'), short('itemID'), str8('text')],
 
        0xc8: [int('statisticID'), byte('ammount')],
 
        0xc9: [str16('playerName'), bool('online'), short('ping')],
        0xff: [str16('message')],
    };
    
    function clone(x) {
        var y = {};
        for(var i in x)
            y[i] = x[i].slice(0);
        return y;
    }
    
    exports[18] = {client2server: exports.client2server, server2client: exports.server2client};
    exports[17] = {client2server: exports.client2server, server2client: exports.server2client};
    exports[16] = {client2server: exports.client2server, server2client: exports.server2client};
    
    exports[15] = {client2server: clone(exports[16].client2server), server2client: clone(exports[16].server2client)};
    exports[15].client2server[0x01] = exports[15].client2server[0x01].splice(-1,1);
    exports[15].client2server[0x09] = exports[15].client2server[0x09].splice(1,1);
    exports[15].server2client[0x01] = exports[15].server2client[0x01].splice(-1,1);
    exports[15].server2client[0x09] = exports[15].server2client[0x09].splice(1,1);
    exports[15].server2client[0x64][2][0] = 'str8';
    
    exports[14] = {client2server: clone(exports[15].client2server), server2client: clone(exports[15].server2client)};
    exports[14].client2server[0x00] = exports[14].client2server[0x00].splice(0,1);
    exports[14].client2server[0x01] = exports[14].client2server[0x01].splice(3,1).splice(4,2);
    exports[14].server2client[0x00] = exports[14].server2client[0x00].splice(0,1);
    exports[14].server2client[0x01] = exports[14].server2client[0x01].splice(3,1).splice(4,2);
    exports[14].server2client[0x08] = exports[14].server2client[0x08].splice(1,2);
    exports[14].server2client[0x09] = exports[14].server2client[0x09].splice(1,3);
    exports[14].server2client[0x46] = exports[14].server2client[0x46].splice(1,1);
}))();

exports.packets = {
    KEEPALIVE:      0x00,
    LOGIN:          0x01,
    HANDSHAKE:      0x02,
    CHAT:           0x03,
    TIME:           0x04,
    ENTITY_EQUIP:   0x05,
    SPAWN_POS:      0x06,
    USE_ENTITY:     0x07,
    HEALTH:         0x08,
    RESPAWN:        0x09,
    PLAYER:         0x0a,
    PLAYER_POS:     0x0b,
    PLAYER_LOOK:    0x0c,
    PLAYER_POS_LOOK:0x0d,
    DIG_BLOCK:      0x0e,
    PLACE_BLOCK:    0x0f,
    WIELD:          0x10,
    USE_BED:        0x11,
    ANIMATION:      0x12,
    ENTITY_ACTION:  0x13,
    PLAYER_SPAWN:   0x14,
    PICKUP_SPAWN:   0x15,
    COLLECT_ITEM:   0x16,
    ADD_VEHICLE:    0x17,
    MOB_SPAWN:      0x18,
    PAINTING:       0x19,
    EXPERIENCE_ORB: 0x1a,
    ENTITY_SPEED:   0x1c,
    ENTITY_DESTROY: 0x1d,
    ENTITY_CREATE:  0x1e,
    ENTITY_MOVE:    0x1f,
    ENTITY_LOOK:    0x20,
    ENTITY_MOVE_LOOK:0x21,
    ENTITY_TELEPORT:0x22,
    ENTITY_STATUS:  0x26,
    ENTITY_ATTACH:  0x27,
    ENTITY_METADATA:0x28,
    ENTITY_EFFECT:  0x29,
    ENTITY_RM_EFFECT:0x2a,
    EXPERIENCE:     0x2b,
    PRE_CHUNK:      0x32,
    MAP_CHUNK:      0x33,
    MULTI_BLOCK_CHANGE:0x34,
    BLOCK_CHANGE:   0x35,
    BLOCK_ACTION:   0x36,
    EXPLOSION:      0x3c,
    SOUND_EFFECT:   0x3d,
    STATE_CHANGE:   0x46,
    THUNDERBOLT:    0x47,
    WINDOW_OPEN:    0x64,
    WINDOW_CLOSE:   0x65,
    WINDOW_CLICK:   0x66,
    SET_SLOT:       0x67,
    WINDOW_ITEMS:   0x68,
    PROGRESS_BAR:   0x69,
    TRANSACTION:    0x6a,
    CREATIVE_ACTION:0x6b,
    UPDATE_SIGN:    0x82,
    ITEM_DATA:      0x83,
    INCREMENT_STAT: 0xc8,
    PLAYER_LIST_INFO:0xc9,
    SERVER_PING:    0xfe,
    DISCONNECT:     0xff,
};

exports.packetNames = {};
for(i in exports.packets)
    exports.packetNames[exports.packets[i]] = i;

function concatBuffers(a, b) {
    var buffer = new Buffer(a.length + b.length);
    a.copy(buffer, 0, 0);
    b.copy(buffer, a.length, 0);
    return buffer;
}

function unpackBuffer(name, size) {
    var f = Buffer.prototype['read'+name+'BE'] || Buffer.prototype['read'+name];
    return pkt => {
        var value = f.call(pkt.data, pkt.ptr);
        pkt.ptr += size;
        return value;
    };
}

function unpackBool(pkt) {
    pkt.needs(1);
    var ret = pkt.data[pkt.ptr] != 0;
    pkt.ptr += 1;
    return ret;
}

function unpackLong(pkt) {
    return [unpackers.uint(pkt), unpackers.uint(pkt)];
}

function unpackString8(pkt) {
    var len = unpackers.short(pkt);
    pkt.needs(len);
    var str = '';
    for(var i = pkt.ptr; i < pkt.ptr + len; i++)
        str += String.fromCharCode(pkt.data[i]);
    pkt.ptr += len;
    return str;
}

function unpackString16(pkt) {
    var len = unpackers.short(pkt) * 2;
    pkt.needs(len);
    var str = '';
    for(var i = pkt.ptr; i < pkt.ptr + len; i+=2)
        str += String.fromCharCode((pkt.data[i] << 8) + pkt.data[i+1]);
    pkt.ptr += len;
    return str;
}

function unpackMobMetadata(pkt) {
    var x;
    var data = {};
    while((x = unpackers.byte(pkt)) != 0x7f) {
        var id = x & 0x1f;
        switch(x >> 5) {
            case 0:
                data[id] = unpackers.byte(pkt);
                break;
            case 1:
                data[id] = unpackers.short(pkt);
                break;
            case 2:
                data[id] = unpackers.int(pkt);
                break;
            case 3:
                data[id] = unpackers.float(pkt);
                break;
            case 4:
                data[id] = unpackers.str16(pkt);
                break;
            default:
                throw new Error('Can\'t figure out what ' + (x >> 5) + ' means');
        }
    }
    return data;
}

function unpackOptionalItem(pkt) {
    var id = unpackers.short(pkt);
    if(id != -1) {
        var count = unpackers.byte(pkt);
        var dataValue = unpackers.short(pkt);
        return {id, count, dataValue};
    }
    return;
}

function unpackItemList(pkt) {
    var len = unpackers.short(pkt);
    var data = {};
    for(var i = 0; i < len; i++)
        data[i] = unpackOptionalItem(pkt);
    return data;
}

function unpackCompressedChunk(pkt) {
    var len = unpackers.int(pkt);
    pkt.needs(len);
    var data = deflate.inflateSync(pkt.data.slice(pkt.ptr, pkt.ptr + len));
    pkt.ptr += len;
    return data;
}

function unpackMultiBlock(pkt) {
    var len = unpackers.short(pkt);
    var data = [];
    for(var i = 0; i < len; i++) {
        var coord = unpackers.short(pkt);
        data[i] = {x: coord >> 12, y: coord & 0xff, z: (coord >> 8) & 0xf};
    }
    for(var i = 0; i < len; i++)
        data[i].blockType = unpackers.byte(pkt);
    for(var i = 0; i < len; i++)
        data[i].metadata = unpackers.byte(pkt);
    return data;
}

var unpackers = {
    byte: unpackBuffer('Int8', 1),
    ubyte: unpackBuffer('UInt8', 1),
    short: unpackBuffer('Int16', 2),
    int: unpackBuffer('Int32', 4),
    uint: unpackBuffer('UInt32', 4),
    float: unpackBuffer('Float', 4),
    double: unpackBuffer('Double', 8),
    bool: unpackBool,
    long: unpackLong,
    str8: unpackString8,
    str16: unpackString16,
    mobMetadata: unpackMobMetadata,
    optionalItem: unpackOptionalItem,
    itemList: unpackItemList,
    compressedChunk: unpackCompressedChunk,
    multiBlock: unpackMultiBlock,
};

function packBuffer(name, size) {
    var f = Buffer.prototype['write'+name+'BE'] || Buffer.prototype['write'+name];
    return value => {
        var buffer = new Buffer(size);
        f.call(buffer, value || 0, 0);
        return buffer;
    };
}

function packBool(bool) {
    return new Buffer([bool ? 1 : 0]);
}

function packLong(v) {
    if(typeof v === 'undefined')
        v = 0;
    if(typeof v === 'number')
        v = [v / 0x100000000, v % 0x100000000];
    return concatBuffers(packers.uint(v[0]), packers.uint(v[1]));
}

function packString8(str) {
    if(!str)
        return packers.short(0);
    var buffer = new Buffer(str.length * 2);
    for (var i = 0; i < str.length; i++)
        packers.byte(str.charCodeAt(i)).copy(buffer, i * 2);
    return concatBuffers(packers.short(str.length), buffer);
}

function packString16(str) {
    if(!str)
        return packers.short(0);
    var buffer = new Buffer(str.length * 2);
    for (var i = 0; i < str.length; i++)
        packers.short(str.charCodeAt(i)).copy(buffer, i * 2);
    return concatBuffers(packers.short(str.length), buffer);
}

function packCompressedChunk(data) {
    if(!(data instanceof Buffer))
        data = new Buffer(data);
    data = deflate.deflateSync(data);
    return concatBuffers(makers.int(data.length), data);
}

var packers = {
    byte: packBuffer('Int8', 1),
    ubyte: packBuffer('UInt8', 1),
    short: packBuffer('Int16', 2),
    int: packBuffer('Int32', 4),
    uint: packBuffer('UInt32', 4),
    float: packBuffer('Float', 4),
    double: packBuffer('Double', 8),
    bool: packBool,
    long: packLong,
    str8: packString8,
    str16: packString16,
    compressedChunk: packCompressedChunk,
};

exports.unpack = (buffer, start, structs) => {
    var pkt = {type: buffer[start], data: buffer, ptr: start+1, needs(nBytes) {assert((this.data.length - this.ptr) >= nBytes);}};
    var struct = structs[pkt.type];
    if(!struct)
        throw Error('Unknown packet 0x' + pkt.type.toString(16));
    
    var packet = {type: pkt.type};
    for(var i in struct) {
        try {
            if(struct[i][1] == '~')
                unpackers[struct[i][0]](pkt);
            else
                packet[struct[i][1]] = unpackers[struct[i][0]](pkt);
        } catch(e) {
            return;
        }
    }
    packet.length = pkt.ptr - start;
    return packet;
};

exports.pack = (packet, structs) => {
    var struct = structs[packet.type];
    if(!struct)
        throw new Error('Unknown packet 0x' + packet.type.toString(16));
    
    var buffer = new Buffer([packet.type]);
    for(var i in struct) 
        buffer = concatBuffers(buffer, packers[struct[i][0]](packet[struct[i][1]]));
    return buffer;
};

exports.packers = packers;
exports.unpackers = unpackers;
