var express = require('express')
  , httpStatus = require('http-status')
  , config = require(__dirname + '/config')
  , routes = require('./routes')
  , models = require('./models')
  , RedisStore = require('connect-redis')(express)
  , parseCookie = require('connect').utils.parseCookie
  , Session = require('connect').middleware.session.Session
  , redis = require('redis')
  , rc = redis.createClient();

var app = module.exports = express.createServer()
  , io = require('socket.io').listen(app);

rc.on('error', function(err) {
  console.log('ERROR REDIS rc : ' + err);
});

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.register('.jade', require('jade')); 
  app.use(express.bodyParser());
  app.use(express.cookieParser()); // Allow parsing cookies from request headers
  app.sessionStore = new RedisStore;
  app.use(express.session({ 
    secret: "philmod secret", 
    store: this.sessionStore
  }));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});
app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);
app.post('/datas', routes.postDatas);
app.get('/series', routes.getSeries);
app.get('/series/id{id}/data/?start={start}&end={end}', routes.getSeriesId);

app.get('/test', function(req,res) {
  res.render('chartTest.jade', { status: 200, title: 'test Chart', layout: false });
})

app.post('/login', function(req,res) {
  console.log('APP . POST /LOGIN');

})

/*app.get('*', function(req, res){  // to redirect all the other requests
  console.log('%o',req.url);
  res.redirect('/');
});*/


app.listen(config.server.port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);




///// SOCKET.IO /////
io.configure(function () {
  io.enable('browser client minification');  // send minified client
  io.enable('browser client etag');          // apply etag caching logic based on version number
  io.enable('browser client gzip');   // gzip the file
  io.set('transports', ['websocket','flashsocket','xhr-polling','jsonp-polling','htmlfile']);
  //io.set('transports', ['websocket','flashsocket','xhr-polling']); // 
  io.set('log level', 2);
  io.set('authorization', function(handshakeData, callback) {
    var cookies = parseCookie(handshakeData.headers.cookie); // Read cookies from handshake headers
    var sessionID = cookies['connect.sid']; // We're now able to retrieve session ID
    if (!sessionID) { // No session? Refuse connection
      return callback('No session', false);
    } else {
      handshakeData.sessionID = sessionID; // Store session ID in handshake data, we'll use it later to associate session with open sockets
      app.sessionStore.get(sessionID, function (err, session) {
        if (err || !session) return callback('Error',false);
        else {
          session.temp4 = 'test4';

          app.sessionStore.set(sessionID, session);

          handshakeData.session = new Session(handshakeData,session); // create a session object, passing data as request and our just acquired session data
          callback(null, true); // we authorize all the sockets for now
        }
      });
    }
  })
});

io.sockets.on('connection', function (socket) {

  var socket_username = null;

  // setInterval(function() {
  //   socket.emit('message','voici...');
  // },1000);
  socket.on('message', function (data) {
    console.log('MESSAGE : ' + data);
  });

  //// LOG ////
  socket.on('isLogged', function(){
    if (socket.handshake.session.loggedIn) {
      socket.emit('login',socket.handshake.session.resLogin);
    }
  });
  socket.on('login', function (data) {
    models.login(data.email,data.password,function(err,res) {
      socket.handshake.session.loggedIn = res.loggedIn; // Add a property to the session
      if (res.loggedIn) {
        console.log('%o',data);
        socket.handshake.session.email = data.email;
        socket.handshake.session.resLogin = res;
      }
      else socket.handshake.session.email = null;
      app.sessionStore.set(socket.handshake.sessionID, socket.handshake.session); // SAVE

      socket.emit('login',res);
    })
  });
  socket.on('logOut', function() {
    console.log('LOG OUT');
    socket.handshake.session.loggedIn = false;
    socket.handshake.session.email = null;
    socket.handshake.session.resLogin = null;
    app.sessionStore.set(socket.handshake.sessionID, socket.handshake.session);
  });
  /////////////

  socket.on('getDatas', function (data) {
    console.log('getDatas from client, with log = ' + data.sys + ' , var=' + data.variable + ' , start=' + data.start + ' , end=' + data.end);
    
    models.getRollUp(data.sys, data.variable, data.start, data.end, function(err,res) {
      if (err) socket.emit('error', err);
      else {
        var out = {
          title: data.sys,
          name: [data.variable], // one name by curve
          data: res
        }
        socket.emit('getDatas', out);
      }
    })
    
    // var dataTemp = require('./models/dataTemp.js');

    // var data_ = [];
    // for (var i=0; i<60; i++) {
    //   var d = new Date(1970, 1, 1, 0, 0+i, 0, 0).getTime(); // ATTENTION: dans Highcharts le mois commence à 1, contrairement au js (!?)
    //   data_[i] = [d, i]; 
    // }
    // console.log('ICI : ' + data_[0]);

    // var data = {
    //   title: 'USD to EUR exchange rate, This TITLE comes from server',
    //   name: ['USD to EUR 1', 'USD to EUR 1'],
    //   data: data_
    // }
    // socket.emit('getDatas', data);

    // // TEMP: renvoyer régulièrement des nouveaux points
    // setInterval(function() {
    //   console.log('i = ' + i);
    //   socket.emit('pushData', [new Date(1970+i, 1, 1, 0, 0, 0, 0).getTime(), i]);
    //   i++;
    // },1000);
    // ///////////////////////////////////////////////////

  });

});
/////////////////////
