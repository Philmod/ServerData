var express = require('express')
  , httpStatus = require('http-status')
  , config = require(__dirname + '/config')
  , routes = require('./routes')
  , models = require('./models')
  , RedisStore = require('connect-redis')(express)
  , parseCookie = require('connect').utils.parseCookie;

var app = module.exports = express.createServer()
  , io = require('socket.io').listen(app);

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
    // Read cookies from handshake headers
    var cookies = parseCookie(handshakeData.headers.cookie);
    // We're now able to retrieve session ID
    var sessionID = cookies['connect.sid'];
    // No session? Refuse connection
    if (!sessionID) {
      callback('No session', false);
    } else {
      // Store session ID in handshake data, we'll use it later to associate session with open sockets
      handshakeData.sessionID = sessionID;
      // On récupère la session utilisateur, et on en extrait son username
      app.sessionStore.get(sessionID, function (err, session) {
        /*if (!err && session && session.username) {
          // On stocke ce username dans les données de l'authentification, pour réutilisation directe plus tard
          handshakeData.username = session.username;
          // OK, on accepte la connexion
          callback(null, true);
        } else {
          // Session incomplète, ou non trouvée
          callback(err || 'User not authenticated', false);
        }*/
        // on peut mettre des infos en faisant : handshakeData.XXX = YYY; on le récupère ensuite avec socket.handshake.XXX
        callback(null, true); // we authorize all the sockets for now
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
  })


  socket.on('login', function (data) {
    console.log('LOGIN : ' + data); 
    console.log('%o',data);
    // TODO: put loggedIn in Session

    // Login & Get the list of systems he has access to
    models.login(data.email,data.password,function(err,res) {
      console.log('RES : ');
      console.log('%o',res);

      //app.sessionStore.set('loggedIn', res.loggedIn);
      console.log('%o',app.sessionStore);
      console.log('%o',socket.handshake);

      socket.emit('login',res);
    })
  })

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
