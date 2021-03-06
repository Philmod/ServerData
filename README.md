ServerData
==========

This is a node.js web server that listens to datas (/datas) in JSON format, and stores it as time-series in Apache Cassandra.

The goal is storing datas coming from several systems that send datas frequently.

JSON Datas
----------
- system name (a column family per system),
- timestamp or time (there is a conversion function to transform to the javascript format)
- all the other properties are variable names and values

Data Model (Cassandra)
----------------------
- One Column Family (CF) per system
- Row keys: 
  - Raw datas, one row per day : var1-20120229
  - Roll-up : var1-rollup-m-20120229 (one data per minute, one row per day), var1-rollup-h-20120200 (one data per hour, one row per month), var1-rollup-d-20120000 (one data per day, one row per year)
- The column name is a timestamp
- The column value is the data for the raw datas, and a JSON string for the roll-up: {value: 0.123, count: 5, max: 0.25, min: 0.02}

System example
--------------
https://github.com/Philmod/data2server

Use
---
app.js

Dependencies
------------
- Apache Cassandra: database for the time-series datas, users and systems informations
- Redis: advanced key-value store for sessions and pub/sub
- Express.js: web development framework
- Socket.io: websocket API
- Backbone.js: MVC
- Twitter bootstrap: simple and flexible HTML, CSS, and Javascript for popular user interface components and interactions
- Highcharts: interactive Javascript charts

Contribute
----------
Please feel free to contribute.

TODO list
---------
- Tests
- A web page to visualize the datas: each client have a login/pass to analyze its systems, an admin page
- Authentification
- Pub/Sub: when a system sends datas to the server, broadcast to the connected clients (socket.io)