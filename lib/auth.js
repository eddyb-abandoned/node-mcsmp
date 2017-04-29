
var http = require('http');
var https = require('https');

exports.login = function login(username, password, callback) {
    var loginData = 'user='+username+'&password='+password+'&version=100000'; /// \todo Fix bogus version.
    https.request({host: 'login.minecraft.net', method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': loginData.length}}, res => {
        res.on('data', data => {
            data = data.toString('utf8').trim();

            if(data == 'Bad login') {
                callback('Bad login');
                return
            }

            data = data.split(':');
            var username = data[2];
            var sessionID = data[3];
            callback(undefined, data[2], data[3]);
        });
    }).on('error', callback).end(loginData);
};

exports.joinServer = function joinServer(username, sessionID, serverHash, callback) {
    http.get({host: 'session.minecraft.net', path: '/game/joinserver.jsp?user='+username+'&sessionId='+sessionID+'&serverId='+serverHash}, res => {
        res.on('data', data => {
            data = data.toString('utf8');
            
            if(data == 'Bad login') {
                callback('Bad login');
                return;
            }
            
            callback();
        });
    }).on('error', callback);
};

exports.checkServer = function checkServer(username, serverHash, callback) {
    http.get({host: 'session.minecraft.net', path: '/game/checkserver.jsp?user='+username+'&serverId='+serverHash}, res => {
        res.on('data', data => {
            data = data.toString('utf8');
            
            if(data == 'YES') {
                callback();
                return;
            }
            
            callback(data);
        });
    }).on('error', callback);
};

exports.genServerHash = function genServerHash() {
    var hash = '';
    for(var i = 0; i < 16; i++)
        hash += Math.floor(Math.random()*16).toString(16);
    return hash;
};