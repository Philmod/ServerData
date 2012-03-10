// https://github.com/simplereach/helenus
var async = require('async'),
  EventEmitter = require('events').EventEmitter,
  config = require('../config.js');

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
    connectEmitter.emit('connected');

    ///// TEST /////
    /*pool.cql("SELECT * FROM '%s' WHERE KEY = '%s'", ['V2I_MOD','test'], function(err, results){
      console.log('CQL RESULTS : ');
      console.log(err, results);
    }); */
    ////////////////
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
          keyspace.createColumnFamily(cfName, function(err) { 
            if (err) return callback(err, null);
            else {
              keyspace.get(cfName, function(err, cf){
                if (err) return callback(err);
                else callback(null, cf);
              });
            }
          });
        }
        else callback(null, cf);
      })
    }
  ]);    
}

exports.insertRows = insertRow = function(cfName, rowKeys, columns, callback) {
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
    keyspace.get(cfName, function(err, cf){
      if (err) callback(err, null)
      else {
        cf.get(rowKey, function(err, row){
          callback(null, row, cf);
        })
      }
    })
  })
}


// keyspace.get('Users', function(err, cf){
//   if(err){
//     throw(err);
//   }
//   // console.log('CF : ' );
//   // console.log('%o',cf);

//   //insert something into the column family
//   cf.insert('foo', {'bar':'baz'}, function(err){
//     if(err){
//       throw(err);
//     }

//     //get what we just put in
//     //the driver will return a Helenus.Row object just like CQL
//     cf.get('foo', function(err, row){
//       if(err){
//         throw(err);
//       }

//       // var out = row.get('bar').value; // => baz  
//       // console.log('OUT = ' + out);
//       console.log('ROW : ');
//       console.log('%o',row);
//       var col = row.get('bar');
//       console.log('COLUMN :');
//       console.log('%o',col);

//     });          
//   });
// });


// Currently Helenus supports the following command for the thrift side of the driver:
//   connection.createKeyspace
//   connection.dropKeyspace
//   keyspace.createColumnFamily
//   keyspace.dropColumnFamily
//   columnFamily.insert
//   columnFamily.get
//   columnFamily.getIndexed
// The following support is going to be added in later releases:
//   columnFamily.delete
//   columnFamily.rowCount
//   columnFamily.columnCount
//   columnfamily.increment
//   columnFamily.truncate
//   SuperColumns
//   CounterColumns
//   Better composite support