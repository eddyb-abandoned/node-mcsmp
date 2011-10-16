#!/usr/bin/node

var mc = require('../'), packets = mc.protocol.packets;

function readPassword(cb) {
    var stdin = process.stdin, stdout = process.stdout, stdio = process.binding('stdio');
    stdio.setRawMode();
    
    stdin.resume();
    
    var password = '';
    function char(c) {
        c = c + '';
        switch(c) {
            case '\n': case '\r': case '\x04':
                stdio.setRawMode(false);
                stdin.pause();
                stdin.removeListener('data', char);
                stdout.write('\n');
                cb(password);
                break
            case '\b':
                stdout.write('\b \b');
                password = password.slice(0, -1);
                break;
            case '\x03':
                process.exit();
                break;
            default:
                stdout.write('*');
                password += c;
                break;
        }
    }
    stdin.on('data', char);
}

if(process.argv.length < 4) {
    console.log('Usage: '+process.argv[1]+' <server> <username>');
    process.exit();
}

var client = new mc.ClientSocket(), server = process.argv[2], username = process.argv[3];

client.on('error', function(e) {
    //client.emit('close');
    console.log('[ERROR] '+e);
    process.exit();
});
client.on('close', function(message) {
    console.log('[DISCONNECT] '+message);
    process.exit();
});
client.on('packet', function(packet) {
    if(packet.type == packets.LOGIN) {
        setTimeout(client.write.bind(client, packets.CHAT, {message: 'Hi, this is a demo client of node-mcsmp. Please ignore me :).'}), 2000);
    } else if(packet.type == packets.CHAT)
        console.log('[CHAT] '+packet.message);
});

console.log('Please enter your password (leave blank for no authentication):');
readPassword(function(password) {
    if(!password)
        password = undefined;
    client.connect(server, username, password, 17);
});
