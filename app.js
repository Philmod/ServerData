  var express = require('express')
  , httpStatus = require('http-status')
  , config = require(__dirname + '/config')
  , routes = require('./routes')
  , models = require('./models')
  , RedisStore = require('connect-redis')(express)
  , parseCookie = require('connect').utils.parseSignedCookie
  , Session = require('connect').middleware.session.Session
  , redis = require('redis')
  , rc = redis.createClient();

var app = module.exports = express();

rc.on('error', function(err) {
  console.log('ERROR REDIS rc : ' + err);
});

// Configuration
var cookieSecret = "philmod secret";
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.engine('.jade', require('jade').renderFile); 
  app.use(express.bodyParser());
  app.use(express.cookieParser(cookieSecret)); // Allow parsing cookies from request headers
  app.sessionStore = new RedisStore();
  app.use(express.session({ 
      key: 'express.sid'
    , store: this.sessionStore
    //, secret: cookieSecret
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

///// Routes /////
app.get('/', routes.index);
app.post('/datas', routes.postDatas);
app.get('/download/:system/:variable', routes.downloadData);
//////////////////

var app2 = app.listen(config.server.port);
console.log("Express server listening");
var io = require('socket.io').listen(app2);


///// SOCKET.IO /////
io.configure(function () {
  io.enable('browser client minification');  // send minified client
  io.enable('browser client etag');          // apply etag caching logic based on version number
  io.enable('browser client gzip');   // gzip the file
  io.set('transports', ['websocket','xhr-polling','jsonp-polling','htmlfile']); //,'flashsocket'
  //io.set('transports', ['websocket','flashsocket','xhr-polling']); // 
  io.set('log level', 1);
  io.set('authorization', function(handshakeData, callback) {
    // var cookies = parseCookie(handshakeData.headers.cookie,cookieSecret); // Read cookies from handshake headers
    // var sessionID = cookies.substr(cookies.indexOf('=')+1,256).split('.')[0]; // .split('.')[0]
    // var sessionID = cookies['connect.sid']; // We're now able to retrieve session ID // .split('.')[0]
    handshakeData.cookie = require('cookie').parse(handshakeData.headers.cookie);
    handshakeData.cookie = parseCookie(handshakeData.cookie['express.sid'], cookieSecret);
    handshakeData.sessionID = handshakeData.cookie;

    if (!handshakeData.sessionID) { // No session? Refuse connection
      return callback('No session', false);
    } else {
      handshakeData.sessionStore = app.sessionStore;
      app.sessionStore.get(handshakeData.sessionID, function (err, session) {
        if (err) return callback(err.soString(),false);
        else if (!session) return callback('session not found',false);
        else {
          handshakeData.session = new Session(handshakeData,session); // create a session object, passing data as request and our just acquired session data
          callback(null, true); // we authorize all the sockets for now
        }
      });
    }
  })
});

io.sockets.on('connection', function (socket) {

  socket.on('message', function (data) {
    console.log('MESSAGE : ' + data);
  });

  //// LOG ////
  socket.on('isLogged', function(){
    if (socket.handshake.session.loggedIn) {
      models.login(socket.handshake.session.email,null,true,function(err,res) {
        socket.emit('login',res);
      })
    }
    else { 
      res = { 
        email: '',
        loggedIn: false,
        systems: [],
        users: []
      };
      socket.emit('login', {});
    }
  });
  socket.on('login', function (data) {
    models.login(data.email,data.password,false,function(err,res) {
      socket.handshake.session.loggedIn = res.loggedIn; // Add a property to the session
      socket.handshake.session.admin = res.admin;
      if (res.loggedIn) {
        socket.handshake.session.email = data.email;
        socket.handshake.session.systems = res.systems;
      }
      else {
        socket.handshake.session.email = null;
        socket.emit('error','Sorry, we coudn\'t verify your email and password');
      }
      app.sessionStore.set(socket.handshake.sessionID, socket.handshake.session); // SAVE
      socket.emit('login',res); // Emit Socket to the Client
    })
  });
  socket.on('logOut', function() {
    console.log('LOG OUT');
    socket.handshake.session.loggedIn = false;
    socket.handshake.session.email = null;
    socket.handshake.session.admin = false;
    socket.handshake.session.systems = null;
    app.sessionStore.set(socket.handshake.sessionID, socket.handshake.session);
  });
  /////////////



  ///// DATAS /////
  socket.on('getDatas', function (data) {
    if (typeof data.variables != 'object') data.variables = [data.variables];  // TEMP
    // console.log('getDatas from client, with log = ' + data.sys + ' , var=' + data.variables + ' , start=' + data.start + ' , end=' + data.end);
    if (data.sys && data.variables) {
      models.getRollUps(data.sys, data.variables, data.start || null, data.end || null, function(err,res) {
        if (err) socket.emit('error', err);
        else socket.emit('getDatas', res);
      })
    }
  });
  /////////////////



  ///// Admin : Web users and Systems /////
  socket.on('addWebUser', function(data){
    models.addWebUser(socket.handshake.session, data.user, JSON.parse(data.form), function(err,res) {
      if (err) socket.emit('error',err);
      else socket.emit('onAdminSuccess',res);
    });
  });
  socket.on('modifyWebUser', function(data){
    models.modifyWebUser(socket.handshake.session, data.user, JSON.parse(data.form), function(err,res) {
      if (err) socket.emit('error',err);
      else socket.emit('onAdminSuccess',res);
    });
  });
  socket.on('addSystemUser', function(data){
    models.addSystemUser(socket.handshake.session, data.user, JSON.parse(data.form), function(err,res) {
      if (err) socket.emit('error',err);
      else socket.emit('onAdminSuccess',res);
    });
  });
  socket.on('deleteSystem', function(data){
    models.deleteSystem(socket.handshake.session, data.user, JSON.parse(data.form), function(err,res) {
      if (err) socket.emit('error',err);
      else socket.emit('onAdminSuccess',res);
    });
  });
  /////////////////////////////////////////

});
/////////////////////

