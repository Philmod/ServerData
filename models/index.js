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
	system, time, login, password ;
	for (var i in jsonObj) {
		if (i == 'system') {
			var system = jsonObj[i];
	  	system = system.replace(/-/g,"_"); // the column family name can't contain "-"
	  	system = system.toLowerCase; // to lower case
	  }
		else if ( (i == 'timestamp') || (i == 'time') )  {
			var time = timeLV2JS(jsonObj[i]);
		}
		else if ( (i == 'password') )  {
			var password = jsonObj[i];
		}
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
	if (!password) return callbackSet('There is no password', null);

	// Check LOGIN + PASSWORD
	console.log('password : ' + password);
	loginSystem(system,password, function(err,logged) {
		if (err) return callbackSet(err, null);
		else if (!logged) return callbackSet('Invalid username or password', null);
		else {
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
    	callback(null,results);
	  }
	});

}

exports.getRawData = function(cfName, variable, callback) {
	var startTime = new Date('2010-01-01').getTime(), // start in 2010 (ServerData has been created in 2012)
    endTime = new Date().getTime(); // stop TODAY

	var rowKeys = [],
		data = '';

	for(loopTime = startTime; loopTime < endTime; loopTime += 86400000) { // 24*3600*1000 ms/day
    var loopDay = new Date(loopTime);
    var loopDayFormated = loopDay.toFormat('YYYYMMDD');
    var rowKey = variable + '-' + loopDayFormated;
    rowKeys.push(rowKey);
	}

	var iterator = function(rowKey, cb) {
		helenus.getRow(cfName, rowKey, function(err,row,cf) {
	    if (err) cb(err,null);
	    else {
	    	row.forEach(function(name,value,ts,ttl){
	    		if (name && value) data += new Array(name,value) + '\n';
	      });
	      cb(null);
	    }
	  });
	}
	async.forEachSeries(rowKeys, iterator, function(err){
    if (err) callback(err,null);
    else {
    	callback(null,data);
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

exports.login = login = function(login,pass,logged,callback) {
	var out = {
  	loggedIn: false,
  	email: null,
  	systems: null,
  	admin: false
  };
	helenus.getRow('Users',login, function(err,row,cf) {
		if (err) callback(err,out);
		else {
			var passCass = row.get('password');
			if (passCass) passCass = passCass.value;

			// 1. Check password
			if ( (logged || pass == passCass || (pass=='' && typeof(passCass)=='undefined')) && !(typeof row[0] == 'undefined') ) {
				// 2. Get systems name
				var columnsSys = row.nameSlice('s000000','s999999');
				var systems = [];
				for (var i=0; i<columnsSys.length; i++) {
					systems[i] = columnsSys[i].value;
				}
				
				var admin = row.get('admin');
				if (admin) admin = admin.value;
				else admin = false;

				// 3. Get systems informations
				var systemsVar = {};
				async.mapSeries(systems, system2var, function(err,results){
				  for (var i=0; i<systems.length; i++) {
				  	systemsVar[systems[i]] = results[i];
				  }
				  out.loggedIn = true;
				  out.email = login;
				  out.systems = systemsVar;
				  out.admin = admin;

				  // 4. If admin, send the list of users and systems authorized
				  if (admin) {
				  	getUsersSystems(function(err,users) {
						  if (err) console.log('error : ' + err);
						  else {
						  	out.users = users;
						  	callback(err,out);
						  }
						})
				  }
				  else callback(err,out);
				});
			}
			else callback(null,out);
		}
	})
}

getUsersSystems = function(callback) {
	helenus.getRow('Users', 'List', function(err,row,cfUsers) { // Get the list of the users
    if (err) return callback(err,null);
    var users = {};
    var usersArray = new Array();
    row.forEach(function(name,value,ts,ttl){
  		users[name] = new Array();
  		usersArray.push(name);
    });

    function iterator(item, cb) { // ITERATOR
      var user = item; 
      var systems = new Array();
      cfUsers.get(user, function(err,columnsUser) { // get user columns
      	if (err) cb(err);
        var nb = 0;
        for (var i=0; i<columnsUser.length; i++) { // loop through the columns, need to catch only the systems
          (function(e) {
          	var n = columnsUser[e].name; // s*000001*
          	if ( n.length===7 & n[0]==='s' & isNumeric(n.substring(1,20)) ) users[user].push(columnsUser[e].value);
            if (e == columnsUser.length-1) cb(null);
          })(i);
        }
      })
    }
    
    async.forEach(usersArray, iterator, function(err) { 
      if (err) return callback(err,null);
      else {
      	delete users['admin']; // we remove the 'admin' one
      	return callback(null,users);
      }
    })

  })
}

function isNumeric(data){
  return parseFloat(data)==data;
}

loginSystem = function(system,password, callback) {
	helenus.getRow(system,'data', function(err,row,cf) {
		if (err) callback(err,out);
		else {
			var passSystemDB = row.get('password');
			if (!passSystemDB) return callback('There is no password stored for this system, it must be introduced via the web page (admin)', false);
			else {
				if (passSystemDB.value == password) {
					return callback(null,true); // OK
				}
				else return callback('The password is not correct',false);
			}
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

///// ADMIN section /////
checkIsAdmin = function(session,email,callback) {
	login(email,null,true,function(err,res) {
		if (err) return callback(err,null);
		if (!res.admin || !session.admin) return callback('You aren\'t allowed to change these informations',false);
		else return callback(null,res.admin);
	})
}

exports.addWebUser = function(session,user,form,callback) {
	checkIsAdmin(session, user.email, function(err,isAdmin) {
		if (err) return callback(err,null);
		if (isAdmin) {
			///// Check email + passwords /////
			if (form.password !== form.passwordBis) return callback('The two passwords are not the same',null); 
			if (form.password.length < 8) return callback('The password length must be at least 8 characters',null); 
	  	var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
	  	if (!filter.test(form.email)) return callback('Please provide a valid email address',null);
	  	///////////////////////////////////

	  	///// Check if the user doesn't already exist & Add the User /////
	  	helenus.getRow('Users', form.email, function(err,row,cfUsers) {
	  		if (err) return callback(err,null);
	  		if (row.count!=0) return callback('An account with this email already exists',null);
	  		else {
	  			cfUsers.insert(form.email, {password: form.password}, function(err){
            if (err) return callback(err,null);
            else { 
            	///// Add the user to a List ///// (because we cannot retrieve all the rows of a CF with helenus)
            	var user = {}; user[form.email] = null;
            	cfUsers.insert('List', user, function(err){
		            if (err) return callback(err,null);
		            else return callback(null,'The new web user is inserted in the DB');
		          });
            }
          });
	  		}
	  	});
	  	//////////////////////////////////////////////////////////////////

		}
	});
}

exports.modifyWebUser = function(session,user,form,callback) {
	checkIsAdmin(session, user.email, function(err,isAdmin) {
		if (err) return callback(err,null);
		if (isAdmin) {
			if (form.passwordNew !== form.passwordNewBis) return callback('The two passwords are not the same',null); 
			if (form.passwordNew.length!=0 && form.passwordNew.length < 8) return callback('The password length must be at least 8 characters',null); 
			
			helenus.getRow('Users', form.user, function(err,row,cfUsers) {
				if(err) return callback(err,null);
				var columnsSys = row.nameSlice('s000000','s999999'); // Get the actual list of the systems
				async.series([
					function(cb) {  // 1. Change password if needed
						if (form.passwordNew.length!=0) {
							cfUsers.insert(form.user, {password: form.passwordNew}, function(err){
						    if (err) cb(err,null);
						    else cb(null,'The password has been changed. ');
						  });
						}
						else cb(null,null);
					},
					function(cb) {  // 2. Update systems access : systems to remove
						for (var i=0; i<columnsSys.length; i++) { // loop through the existing systems in database
							(function(e){
								var bool = false;
								form.sysAuth.forEach(function(sys){
									if (sys === columnsSys[e].value) bool = true;
								})
								if (!bool) {
									cfUsers.remove(form.user, columnsSys[e].name, {timestamp: new Date()}, function(err) { 
										if (err) cb(err,null);
										else {
											if (e==columnsSys.length-1) cb(err,null);
										}
									})
								}
								else {
									if (e==columnsSys.length-1) cb(err,null);
								}
							})(i);
						}
					},
					function(cb) {  // 3. Update systems access : systems to add
						for (var i=0; i<form.sysAuth.length; i++) { // loop through the existing systems in database
							(function(e){
								var bool = true; // == to add
								for (var j=0; j<columnsSys.length; j++) {
									if (form.sysAuth[e] === columnsSys[j].value) bool = false; // already exists
								}
								if (bool) {
									var numSys = parseFloat(columnsSys[columnsSys.length-1].name.substring(1,20)) + e ;
	                numSys = numSys.toString();
	                for (var i=numSys.length; i<6; i++) { numSys = '0' + numSys; } // we won't have one million systems...
	                numSys = 's' + numSys;
	              	var column = {}; column[numSys] = form.sysAuth[e];
									cfUsers.insert(form.user, column, function(err){
								    if (err) cb(err,null);
								    else {
								    	if (e==columnsSys.length-1) cb(err,'The systems list has been updated. ');
								    }
								  });
								}
								else {
									if (e==columnsSys.length-1) cb(err,'The systems list has been updated. ');
								}
							})(i);
						}
					}
				],
				function(err,results){
					if (err) return callback(err,null);
					var message = '';
					results.forEach(function(r) {
						if (r) message += r;
					})
					return callback(null,message)
				})
			})
		}
	})
}

exports.addSystemUser = function(session,user,form,callback) {
	checkIsAdmin(session, user.email, function(err,isAdmin) {
		if (err) return callback(err,null);
		if (isAdmin) {

			///// Check passwords /////
			if (form.password !== form.passwordBis) return callback('The two passwords are not the same',null); 
			if (form.password.length < 8) return callback('The password length must be at least 8 characters',null); 
			if (form.login.length < 5) return callback('The login length must be at least 5 characters',null); 
	  	///////////////////////////

	  	helenus.getRow(form.login, 'data', function(err,row,cfSystems) {
	  		if (err) return callback(err,null);
			  cfSystems.insert('data', {password: form.password}, function(err){
			    if (err) return callback(err,null);
			    else return callback(null,'The password has been linked to this (new) system');
			  });
			});

		}
	});
}

exports.deleteSystem = function(session,user,form,callback) {
	// Only delete the access for all users, the data will remain in the database.
	checkIsAdmin(session, user.email, function(err,isAdmin) {
		if (err) return callback(err,null);
		if (isAdmin) {
			helenus.getRows('Users', function(err,cfUsers) {
			  
			  cfUsers.get('List', function(err,users) { // Get the list of the users
			    if (err) return callback(err,null);

			    function iterator(item, cb) { // ITERATOR
			      var user = item;
			      cfUsers.get(user, function(err,systemsUser) { // get user systems
			        var nb = 0;
			        for (var j=0; j<systemsUser.length; j++) { // loop through the systems
			          (function(e) {
			            if (systemsUser[e].value === form.system) {
			              cfUsers.remove(user, systemsUser[e].name, {timestamp: new Date()}, function(err) { // delete column if it's the system from the form
			                nb++;
			                if (err) cb(err);
			                if (nb===systemsUser.length) cb(err); // leave the loop if finished
			              })
			            }
			            else {
			              nb++;
			              if (nb===systemsUser.length) cb(err); // leave the loop if finished
			            }
			          })(j);
			        }
			      })
			    }
			    
			    async.forEach(users, iterator, function(err) { // FOR EACH
			      if (err) return callback(err,null);
			      else return callback(null,'The system \'' + form.system + '\' has been deleted from all users');
			    })

			  })
			});
		}
	});
}
/////////////////////////
