var socket = io.connect(host);
socket.on('getDatas', function (data) {
  console.log('%o',data);
  createChart(data);
});
socket.on('pushData', function (data) {
  chart.series[0].addPoint(data);
});
socket.on('error', function (data) {
  console.log('ERROR : ' + err);
});
