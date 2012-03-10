var config = {};

config.server = {};
config.feed = {};
config.mongodb = {};

config.cassandra = {
	hosts: ['localhost:9160'],
	keyspace: 'Keyspace1',
	user: '',
	password: '',
}

config.server.port = 3001;
config.server.domain = 'http://localhost:3000/';

config.feed.limit = 25;
config.feed.skip = 0;

config.mongodb.connectionUrl = 'mongodb://localhost/jsonfeedserver';

module.exports = config;
