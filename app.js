
/**
 * Module dependencies.
 */

var express = require('express')
  , httpStatus = require('http-status')
  , config = require(__dirname + '/config')
  , routes = require('./routes')
  , xml2js = require('xml2js')
  , parser = new xml2js.Parser();

var app = module.exports = express.createServer()
  , io = require('socket.io').listen(app);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.register('.jade', require('jade'));
  app.use(express.bodyParser());
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
app.get('/', routes.get);
app.post('/datas', routes.postDatas);
app.get('/series', routes.getSeries);
app.get('/series/id{id}/data/?start={start}&end={end}', routes.getSeriesId);

app.get('/test', function(req,res) {
  res.render('chartTest.jade', { status: 200, title: 'test Chart', layout: false });
})

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
});
io.sockets.on('connection', function (socket) {

  socket.emit('news', { hello: 'world' });

  socket.on('getDatas', function (data) {
    console.log('getDatas from client, with log = ' + data.log);
    var dataTemp = require('./models/dataTemp.js');

    var data_ = [];
    for (var i=0; i<100; i++) {
      var d = new Date(1970+i, 1, 1, 0, 0, 0, 0).getTime(); // ATTENTION: dans Highcharts le mois commence à 1, contrairement au js (!?)
      data_[i] = [d, i]; 
    }
    console.log('ICI : ' + data_[0]);

    var data = {
      title: 'USD to EUR exchange rate, This TITLE comes from server',
      name: ['USD to EUR 1', 'USD to EUR 1'],
      data: data_
    }
    socket.emit('getDatas', data);

    // TEMP: renvoyer régulièrement des nouveaux points
    setInterval(function() {
      console.log('i = ' + i);
      socket.emit('pushData', [new Date(1970+i, 1, 1, 0, 0, 0, 0).getTime(), i]);
      i++;
    },1000);
    ///////////////////////////////////////////////////

  });

});
/////////////////////
