var httpStatus = require('http-status')
  , db = require('../models');

var postedDatas = new Array();

/*
 * GET home page.
 */
exports.get = function(req, res){
  res.send('En construction...', 200);
};

/*
 * POST datas
 */
var i = 0,
  datas = new Array();
exports.postDatas = function(req, res){
  /*console.log('%o',req);
  console.log('REQ.HEADERS : ');
  console.log('%o',req.headers);
  console.log('%o',req.body);*/

  if (req.is('application/xml')) {
    console.log('%o',req.body);

  }
  else if (req.is('application/json')) {
    var data = req.body;

    postedDatas.push(data);
    if (postedDatas.length % 1000 == 0) console.log('postedDatas.length = ' + postedDatas.length);

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
 * GET series
 */
exports.getSeries = function(req, res){
  // Pour avoir la liste de ses séries
  res.send('En construction...', 200);
};

/*
 * GET series content
 */
exports.getSeriesId = function(req, res){
  // Read series data by id.
  // start: an ISO 8601 date: 2012-01-08T00:21:54.000+0000
  res.send('En construction...', 200);
};