
var http = require('http'), https = require('https');

exports.login = function login(username, password, callback) {
    var loginData = 'user='+username+'&password='+password+'&version=100000'; /// \todo Fix bogus version.
    https.request({host: 'login.minecraft.net', method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': loginData.length}}, function(res) {
        res.on('data', function(data) {
            data = data.toString('utf8').trim();
            
            if(data == 'Bad login') {
                callback('Bad login');
                return
            }
            
            data = data.split(':');
            var username = data[2], sessionID = data[3];
            callback(undefined, data[2], data[3]);
        });
    }).on('error', callback).end(loginData);
};

exports.joinServer = function joinServer(username, sessionID, serverHash, callback) {
    http.get({host: 'session.minecraft.net', path: '/game/joinserver.jsp?user='+username+'&sessionId='+sessionID+'&serverId='+serverHash}, function(res) {
        res.on('data', function(data) {
            data = data.toString('utf8');
            
            if(data == 'Bad login') {
                callback('Bad login');
                return;
            }
            
            callback();
        });
    }).on('error', callback);
};
