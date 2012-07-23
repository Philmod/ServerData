// https://github.com/simplereach/helenus
var async = require('async'),
  EventEmitter = require('events').EventEmitter,
  config = require('../config.js'),
  model = require('../models/index.js');

var helenus = require('helenus')
  , pool = new helenus.ConnectionPool({
      hosts      : config.cassandra.hosts,
      keyspace   : config.cassandra.keyspace,
      user       : config.cassandra.user,
      password   : config.cassandra.password,
      timeout    : 3000
    });

pool.on('error', function(err){
  console.log('ERROR : ');
  console.error(err.name, err.message);
});

var keyspace;
var connectEmitter = new EventEmitter;
connectEmitter.setMaxListeners(100); 
pool.connect(function(err, ks){
  if(err){
    throw(err);
    callback(err);
  } else {
    keyspace = ks;
    console.log('keyspace = ' + keyspace.definition.name);

    getOrCreateCF('Systems', function(err, cf){ // include the systems informations
      getOrCreateCF('Users', function(err, cf){ // include the users informations and systems linked
        connectEmitter.emit('connected');
      })
    })
  }
});

getOrCreateCF = function(cfName, callback) {
  async.series([
    function(cb) {
      if (!keyspace) { // if the DB is not already connected, wait for it
        connectEmitter.on('connected', function() {
          cb();
        })
      }
      else {
        cb();
      }
    },
    function() {
      keyspace.get(cfName, function(err, cf){
        if (err) { // if ERR, the CF doesn't exist, so we create it
          var options = {
            key_validation_class: config.cassandra.key_validation_class,
            comparator_type: config.cassandra.comparator_type,
            default_validation_class: config.cassandra.default_validation_class
          };
          if (cfName == 'Systems' || cfName == 'Users') {
            options.comparator_type = 'UTF8Type';
            options.default_validation_class = 'UTF8Type';
          }
          keyspace.createColumnFamily(cfName, options, function(err) { // create the column family
            if (err) return callback(err, null);
            else {
              // get the new keyspace
              keyspace.get(cfName, function(err, cf){ 
                if (err) return callback(err);
                else callback(null, cf);
              });
            }
          });
          // Insert new system in 'Users' CF, 'admin' rowKey (if doesn't exist)
          getRow('Users', 'admin', function(err,row,cfUsers) {
            if (err) console.log('ERROR Users getRow admin : ' + err);
            else {
              var columnsSys = row.nameSlice('s000000','s999999');
              // check if this system is already in the row
              var bool = false;
              for (var i=0; i<columnsSys.length; i++) {
                if (columnsSys[i].value == cfName) bool = true;
              }
              if (!bool) {
                var numSys = parseFloat(columnsSys[columnsSys.length-1].name.substring(1,20)) + 1 ;
                numSys = numSys.toString();
                for (var i=numSys.length; i<6; i++) { numSys = '0' + numSys; } // we won't have one million systems...
                numSys = 's' + numSys;
                var column = {}; column[numSys] = cfName;
                cfUsers.insert('admin', column, function(err){ // INSERT
                  if (err) console.log('ERROR Systems new variables 2 : ' + err);
                  else console.log('NEW SYSTEM in USERS CF : ' + cfName)
                });
              }
              else { console.log('Already exists'); }
            }
          })
        }
        else { callback(null, cf); }
      })
    }
  ]);    
}

exports.insertRows = function(cfName, rowKeys, columns, callback) {
  getOrCreateCF(cfName, function(err, cf){
    if (err) callback(err,null);
    else {
      var nb=0;
      for (var i=0; i<rowKeys.length; i++) {
        (function(e){ //anonymous wrapper
          var iterator = function(item, cb) {
            var column = {};
            column[item[0]] = item[1];
            cf.insert(rowKeys[e], column, function(err){ // INSERT
              if (err) cb(err, null);
              else cb(null, null);
            });
          }
          async.forEach(columns[e], iterator, function(err) { //DATA.FOREACH
            if (err) callback(err, null);
            else {
              nb++;
              if (nb===rowKeys.length) callback(null, 'done');
            }
          })
        })(i); //we are immediately executing the function by appending (i), with the correct i value as argument
      }

    }
  });
}

exports.getRow = getRow = function(cfName, rowKey, callback) {
  getOrCreateCF(cfName, function(err, cf){
    if (err) return callback(err, null);
    keyspace.get(cfName, function(err, cf){
      if (err) return callback(err, null)
      else {
        cf.get(rowKey, function(err, row){
          return callback(null, row, cf);
        })
      }
    })
  })
}

exports.getRows = function(cfName, callback) {
  getOrCreateCF(cfName, function(err, cf){
    if (err) return callback(err, null);
    keyspace.get(cfName, function(err, cf){
      if (err) return callback(err, null)
      else {
        return callback(null,cf);
      }
    })
  })
}
