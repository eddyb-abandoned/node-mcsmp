
var http = require('http'), https = require('https');

exports.login = function login(username, password, cb, err) {
    var loginData = 'user='+username+'&password='+password+'&version=100000'; /// \todo Fix bogus version.
    https.request({host: 'login.minecraft.net', method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': loginData.length}}, function(res) {
        res.on('data', function(data) {
            data = data.toString('utf8').trim();
            
            if(data == 'Bad login') {
                err('Bad login');
                return
            }
            
            data = data.split(':');
            var username = data[2], sessionID = data[3];
            cb(data[2], data[3]);
        });
    }).on('error', err).end(loginData);
};

exports.joinServer = function joinServer(username, sessionID, serverHash, cb, err) {
    http.get({host: 'session.minecraft.net', path: '/game/joinserver.jsp?user='+username+'&sessionId='+sessionID+'&serverId='+serverHash}, function(res) {
        res.on('data', function(data) {
            data = data.toString('utf8');
            
            if(data == 'Bad login') {
                err('Bad login');
                return;
            }
            
            cb();
        });
    }).on('error', err);
};
