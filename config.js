var config = {};

config.server = {};
config.feed = {};
config.cassandra = {};

config.server.port = 3000;
config.server.domain = 'http://localhost:3000/';

config.cassandra = {
	hosts: ['localhost:9160'],
	keyspace: 'Keyspace1',
	user: '',
	password: '',
	replication_factor: 1,
	key_validation_class: 'UTF8Type', // The data type of row keys
	comparator_type: 'UTF8Type', // The data type of column names, in order to sort
	default_validation_class: 'UTF8Type' // The default data type of column values
	// ATTENTION: these 3 parameters can vary from datas CFs to admin CFs...
}

module.exports = config;
