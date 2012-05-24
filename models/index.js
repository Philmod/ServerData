//var dateFormat = require('../public/javascripts/dateFormat.js');
require('date-utils');
var async = require('async'),
	helenus = require('../models/helenus.js');

var timeLV0 = Date.UTC(1904,0,1,0,0,0); // Labview zero time : [01-01-1904 00:00:00]
timeLV2JS = function(time) {
	// LABVIEW timestamp : LabVIEW calculates this timestamp using the number of SECONDS elapsed 
	// since 12:00 a.m., Friday, January 1, 1904, Universal Time [01-01-1904 00:00:00]. 
	// JAVASCRIPT timestamp : number of MILLISECONDS since 1970/01/01
	time = time*1000; // seconds --> milliseconds
	time = time + timeLV0; // add of the offset timeLV0

	/*var dat = new Date();
	dat.setTime(time);
	console.log('date = ' + dat);*/

	return time;
}

exports.set = set = function(jsonObj, callbackSet) {
	var vars = [],
	system, time;
	for (var i in jsonObj) {
		if (i == 'system') {
			var system = jsonObj[i];
	  	system = system.replace(/-/g,"_"); // the column family name can't contain "-"
	  }
		else if ( (i == 'timestamp') || (i == 'time') ) 
			var time = timeLV2JS(jsonObj[i]);
		else if ( typeof jsonObj[i] == 'object' ) {
			for (var j in jsonObj[i]) {
				var name = i + '_' + j;
				vars[name] = jsonObj[i][j];
			}
		}
		else {
			var name = i;
			vars[name] = jsonObj[i];
		}
	}
	if (!system) return callbackSet('The system name is not specified', null);
	if (!time) return callbackSet('There is no timestamp', null);

	//console.log('system = ' + system);

	// 0. cfName + rowKeys + columns + ...
	var cfName = system;
	var datas = vars2cassandra(vars,time);

	async.parallel([
		function(CB) {
			// 1. Brut datas introduction
			helenus.insertRows(cfName, datas.rowKeys.brut, datas.columns, function(err) {
				if (err) CB(err);
				else CB(null);
			})
		},
		function(CB) {
			// 2. Rolls-up
			var nb=0;
			for (var i=0; i<datas.columns.length; i++) {
				(function(e){
					async.parallel([
						function(cb) { // MIN (one row by day)
							setRollup(cfName, datas.rowKeys.m[e], datas.timestamps.m[e], datas.columns[e][0][1], function(err,res) { cb(err); })
						},
						function(cb) { // HOUR (one row by month)
							setRollup(cfName, datas.rowKeys.h[e], datas.timestamps.h[e], datas.columns[e][0][1], function(err,res) { cb(err); })
						},
						function(cb) { // DAY (one row by year)
							setRollup(cfName, datas.rowKeys.d[e], datas.timestamps.d[e], datas.columns[e][0][1], function(err,res) { cb(err); })
						},
					],
					function(err) {
						if (err) CB(err);
						else {
							++nb;
							if (nb == datas.columns.length) { 
								CB(null);
							}
						}
					});
				})(i);
			}
			// 3. Insert new variable(s) in 'Systems' CF (if doesn't exist)
			helenus.getRow('Systems', system, function(err,row,cfSystems) {
	      if (err) console.log('ERROR Systems new variables : ' + err);
	      else {
	      	for (var varName in vars) {
	      		if (row) 
			      	var column = row.get(varName);
			      if (!column) {
		      		var column = {};
	      			column[varName] = '';
							cfSystems.insert(system, column, function(err){ // INSERT
		            if (err) console.log('ERROR Systems new variables 2 : ' + err);
		          });
		        }
		      }
		    }
	    });
		}
	],
	function(err) {
		callbackSet(err);
	})
}

// The vars2cassandra function create the various row keys (for data and roll-up), and the columns (name, value)
vars2cassandra = function(vars,time) {
	var date = new Date(); // création d'un nouvel objet Date
	date.setTime(time); // on lui attribue le temps du timestamp 'time'

	var k = 0,
		columns = new Array; 
	var rowKeys = {
		brut: new Array,
		m: new Array, //min
		h: new Array, //hour
		d: new Array, //day
	};
	var timestamps = {
		brut: new Array,
		m: new Array, //min
		h: new Array, //hour
		d: new Array, //day
	};
	for (var i in vars) {
		rowKeys.brut[k] = i + '-' + date.toFormat("YYYYMMDD");
		rowKeys.m[k] = i + '-rollup-m-' + date.toFormat("YYYYMMDD");
		rowKeys.h[k] = i + '-rollup-h-' + date.toFormat("YYYYMM") + '00';
		rowKeys.d[k] = i + '-rollup-d-' + date.toFormat("YYYY") + '0000';

		date.setTime(time);
		timestamps.brut[k] = time;
		date.setMilliseconds(0); date.setSeconds(0);
		timestamps.m[k] = date.getTime();
		date.setMinutes(0);
		timestamps.h[k] = date.getTime();
		date.setHours(0);
		timestamps.d[k] = date.getTime();

		columns[k] = new Array;
		columns[k][0] = new Array(time, vars[i]); // would take various columns for each row key
		k++;
	}
	return {
		rowKeys: rowKeys,
		timestamps: timestamps,
		columns: columns,
	};
}

setRollup = function(cfName, rowKey, timestamp, value, callback) {
	helenus.getRow(cfName, rowKey, function(err,row,cf) {
		if (err) {
			console.log('setRollup error 1 : ' + err);
			callback(err);
		}
		else {
			var newCol = { // NEW VALUES
				value: value,
				count: 1,
				max: value,
				min: value
			}
			if (!row || typeof(row)=='undefined') {
				console.log('NO ROW!!!!!!!!!!');
			}
			else { var c = row.get(timestamp); } // GET COLUMN
			if (c) { // there is already this column, so we update
				c = JSON.parse(c.value); 
				newCol.value = (c.count*c.value + newCol.value) / (c.count+1);
				newCol.count = c.count + 1;
				newCol.max = Math.max(newCol.max, c.max);
				newCol.min = Math.min(newCol.min, c.min);
			}
			// INSERT :
			var newColumn = {};
      newColumn[timestamp] = JSON.stringify(newCol);
			cf.insert(rowKey, newColumn, function(err){ // INSERT
        if (err) callback(err);
        else callback(null, 'done');
      });
		}
	})
}


getRollUp = function(cfName, variable, start, end, callback) {
	if (!start || !end) {
		var date = new Date().getTime(),
	    start = date-1000*3600*24*365*30,
	    end = date+1000*3600*24*365*1;
	}
	var rowKey = dif2rowKey(start,end,variable);
	if (rowKey.error) return callback(rowKey.error);
	var results = new Array;
	var k=0;

	var iterator = function(rowKey, cb) {
    helenus.getRow(cfName, rowKey, function(err,row,cf) {
      if (err) cb(err);
      else {
      	var columns = row.nameSlice(start,end);
      	for (var i=0; i<columns.length; i++) {
      		var obj = JSON.parse(columns[i].value);
      		results[k] = [parseInt(columns[i].name), obj.value];
      		++k;
      	}
	      cb(null);
	    }
    });
  }
	async.forEach(rowKey.rowKeys, iterator, function(err){
    if (err) callback(err);
    else {
    	// console.log('getRollUp : results.length = ' + results.length);
    	// console.log('k length = ' + results.length);
    	var out = {
		    system: cfName,
		    variable: variable,
		    data: results
		  };
    	callback(null,out);
	  }
	});
}


exports.getRollUps = function(cfName, variables, start, end, callback) {

	var iterator = function(variable, cb) {
    getRollUp(cfName, variable, start, end, function(err,res) {
    	cb(err,res);
    })
  }

	async.map(variables, iterator, function(err, results){
    if (err) callback(err);
    else {
    	console.log('GET ROLL UPS : results.length = ' + results.length);
    	//console.log('%o',results);
    	//console.log('%o',results[0]);
    	callback(null,results);
	  }
	});

}


// Create the rowKey name from start, end and variable name
dif2rowKey = function(start, end, variable) { // start, end in javascript timestamp
	var dif = end - start,
		out = {error: null, rowKeys: new Array};
	if (dif<0 || !dif) {
		out.error = 'dif2rowKey: The end must be greater than the start';
		return out;
	}
	var date = new Date(); 
	date.setTime(start);
	var jsTimestamp = {
		day: 1000*3600*24,
		month: 1000*3600*24*31,
		year: 1000*3600*24*365
	};
	if (dif < jsTimestamp.day) { // P < 1 jour
		out.rowKeys[0] = variable + '-rollup-m-' + date.toFormat("YYYYMMDD");
		out.rowKeys[1] = variable + '-rollup-m-' + date.add({days:1}).toFormat("YYYYMMDD"); // could be on two days
	}
	else if (dif < jsTimestamp.month && dif >= jsTimestamp.day) { // 1 month > P > 1 jour
		out.rowKeys[0] = variable + '-rollup-h-' + date.toFormat("YYYYMM") + '00';
		out.rowKeys[1] = variable + '-rollup-h-' + date.add({months:1}).toFormat("YYYYMM") + '00'; // could be on two months
	}
	else { // P > 1 month
		var startYYYY = date.toFormat("YYYY");
		date.setTime(end);
		var endYYYY = date.toFormat("YYYY");
		var k = 0;
		for (var i = startYYYY; i<=endYYYY; i++) {
			out.rowKeys[k] = variable + '-rollup-d-' + i + '0000';
			k++;
		}
	}
	return out;
}

exports.login = function(login,pass,logged,callback) {
	var out = {
  	loggedIn: false,
  	email: null,
  	systems: null
  };
	helenus.getRow('Users',login, function(err,row,cf) {
		if (err) callback(err,out);
		else {
			var passCass = row.get('password');

			console.log('CHECK:: login='+login+' , passCass='+passCass);
			console.log('%o',row);
			console.log(typeof row[0] == 'undefined');
			console.log(row[0] == 'undefined');

			// 1. Check password
			if ( (logged || pass == passCass || (pass=='' && typeof(passCass)=='undefined')) && !(typeof row[0] == 'undefined') ) {
				// 2. Get systems name
				var columnsSys = row.nameSlice('s000000','s999999');
				var systems = [];
				for (var i=0; i<columnsSys.length; i++) {
					systems[i] = columnsSys[i].value;
				}
				
				// 3. Get systems informations
				var systemsVar = {};
				async.mapSeries(systems, system2var, function(err,results){
				  for (var i=0; i<systems.length; i++) {
				  	systemsVar[systems[i]] = results[i];
				  }
				  out.loggedIn = true;
				  out.email = login;
				  out.systems = systemsVar;
				  callback(err,out);
				});
			}
			else callback(null,out);
		}
	})
}

system2var = function(system, callback) {
	helenus.getRow('Systems',system, function(err,row,cf) {
		var vars = {};
		for (var j=0; j<row.length; j++) {
			vars[row[j].name] = row[j].value;
  	}
  	return callback(err,vars);
	})
}