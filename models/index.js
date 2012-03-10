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
	return time;
}

exports.set = set = function(jsonObj, callbackSet) {
	var vars = [],
	system, time;
	for (var i in jsonObj) {
		if (i == 'system') {
			var system = jsonObj[i];
	  	system = system.replace("-","_"); // the column family name can't contain "-"
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

	console.log('SYSTEM : ' + system);


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
		if (err) callback(err);
		else {
			var newCol = { // NEW VALUES
				value: value,
				count: 1,
				max: value,
				min: value
			}
			var c = row.get(timestamp); // GET COLUMN
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



