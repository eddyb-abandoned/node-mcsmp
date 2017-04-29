#!/usr/bin/env node

var mc = require('../');
var packets = mc.protocol.packets;

var server = mc.createServer(c => {
    c.on('login', u => {
        console.log(u+' just logged in');
        c.write(packets.LOGIN, {playerEID: server.lastEID++, height: 128, maxPlayers: 100});
        c.write(packets.CHAT, {message: 'Hi '+u+' and welcome to a demo server of node-mcsmp :).'});
        c.write(packets.PRE_CHUNK, {x: 0, z: 0, load: true});
        c.write(packets.BLOCK_CHANGE, {x: 0, y: 63, z: 0, blockType: 1});
        c.write(packets.PLAYER_POS, {x: 0, y: 64, stance: 65.7, z: 0});
    });
    c.on('close', m => {
        console.log(c.username+' just logged out ('+m+')');
    });
    c.on('error', e => {
        c.write(packets.DISCONNECT, {message:e});
        console.log(c.username+' just logged out ('+e+')');
    });
});

server.listen(process.argv[2]);
console.log('Listening on '+(process.argv[2] || 25565)+'...');

server.lastEID = 1;
