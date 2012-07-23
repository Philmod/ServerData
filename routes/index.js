var httpStatus = require('http-status')
  , db = require('../models')
  , async = require('async');

/*
 * GET home page.
 */
exports.index = function(req, res){
  //console.log('GET INDEX');
  res.render('index',{
    title: "ServerData",
    host: ""
  })
};

/*
 * POST datas
 */
var i = 0,
  datas = new Array();
exports.postDatas = function(req, res){
  if (req.is('application/xml')) {
    //console.log('%o',req.body);
    res.send('xml is not an accepted format' || err, httpStatus.INTERNAL_SERVER_ERROR);
  }
  else if (req.is('application/json')) {
    var data = req.body;

    db.set(data, function(err) {
      if (err) {
        console.log('db.set : ERROR : ' + err);
        res.send(err.message || err, httpStatus.INTERNAL_SERVER_ERROR);
      }
      else {
        res.send('OK',httpStatus.OK);
      }
    })
    
  }
  else {
    res.send('This content-type is not supported', httpStatus.UNSUPPORTED_MEDIA_TYPE);
  }
};

/*
 * GET data
 */
exports.downloadData = function(req, res){
  //console.log('Get download');

  ///// Arguments /////
  //console.log('%o',req.params);
  /////////////////////

  ///// Check permission through session /////
  var bool = false;
  for (var sys in req.session.systems) {
    if (sys === req.params.system) bool = true;
  }
  if (!bool) return res.redirect(''); // this user (session) has no access to this system
  ////////////////////////////////////////////
  
  db.getRawData(req.params.system, req.params.variable, function(err,data) {
    if (err) {
      console.log('ERROR downloadData, REDIRECT : ' + err);
      res.redirect('');
    }
    else {
      console.log('routes data.length : ' + data.length);

      var date = new Date().toFormat('YYYYMMDD');
      var filename = date + '_' + req.params.system + '_' + req.params.variable + '.csv';
      res.header('content-type','text/csv');
      res.header('content-disposition','attachment');
      res.attachment(filename);
      res.end(data,'UTF-8');
    }
  })

}
