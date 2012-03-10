var cassandra = require('cassandra-client');

// Access the System keyspace
var System = cassandra.System;
var System = new System('localhost:9160');

function createKeyspace(KSname, callback) {
  System.describeKeyspace(KSname, function(err, ksDef) {
    if (err) {
      // The keyspace doesn't exist, we create it: 
      var ksDef = {
        name: KSname,
        strategy_class: 'org.apache.cassandra.locator.NetworkTopologyStrategy',
        strategy_options: { datacenter1: '1' },
        replication_factor: null,
        cf_defs: [],
        durable_writes: true
      };
      System.addKeyspace(new cassandra.KsDef(ksDef), function(err) {
        if (err) {
          console.log('ERROR while creating the keyspace : ' + err);
          callback(err,null);
        } else {
          console.log('keyspace ' + KSname + ' successfully created.');
          callback(null,KSname);
        }
        
      });
    } else {
      console.log("The keyspace " + KSname + " already exists.");
    	// console.log('ksDef: ');
    	// console.log('%o',ksDef);
      callback(null, KSname);
      // assume ksDef contains a full description of the keyspace (uses the thrift structure).
    }
  })
}

var ksName = 'Keyspace1';
createKeyspace(ksName, function(err,KSname) {
  if (err) {console.log('ERROR createKeyspace : ' + err);}
  else {
    console.log('%o', KSname);

    
  }
})

var ColumnDef = new cassandra.ColumnDef({
  name: 'column family TEST'
});
console.log('%o',ColumnDef);

var Connection = cassandra.Connection;
var con = new Connection({host:'cassandra-host', port:9160, keyspace:'Keyspace1'});
console.log('%o',con);
con.connect(function(err) {
  console.log('ERROR connect : ' + err);
}); 

// con.execute('SELECT ? FROM Keyspace1', [], function (err, rows) {
//     if (err) {
//         console.log('ERROR execute : ' + err);
//     } else {
//         console.log(rows.rowCount());
//         console.log(rows[0]);
//     }
// });

// Updating

// con.execute('UPDATE Standard1 SET ?=? WHERE key=?', ['cola', 'valuea', 'key0'], function(err) {
//     if (err) {
//         console.log('err: ' + err);
//     } else {
//     	console.log('handle success');
//         // handle success.
//     }
// });