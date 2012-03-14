var chart;

///// SOCKET.IO /////
var socket = io.connect('http://localhost');
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
/////////////////////

///// CHART /////
$(document).ready(function() {
  // On demande les données via socket.io: 
  socket.emit('getDatas', { log: 'sysTest' });
});

function createChart(inputData) {
  chart = new Highcharts.Chart({
    chart: {
        renderTo: 'container',
        zoomType: 'x',
        spacingRight: 20
    },
    title: {
        text: inputData.title
    },
    subtitle: {
        text: document.ontouchstart === undefined ?
            'Click and drag in the plot area to zoom in' :
            'Drag your finger over the plot to zoom in'
    },
    xAxis: {
        type: 'datetime',
        title: {
            text: null
        }
    },
    yAxis: {
        title: {
            text: 'Exchange rate'
        },
        startOnTick: false,
        showFirstLabel: false,
        plotBands : [{
          from : 12.6738,
          to : 15,
          color : 'rgba(68, 170, 213, 0.2)',
          label : {
            text : 'Bande de couleur, ca peut servir pour alarmes & co!'
          }
        }]
    },
    tooltip: {
        shared: true
    },
    legend: {
        enabled: false
    },
    plotOptions: {
        area: {
            fillColor: {
                linearGradient: [0, 0, 0, 300],
                stops: [
                    [0, Highcharts.getOptions().colors[0]],
                    [1, 'rgba(2,0,0,0)']
                ]
            },
            lineWidth: 1,
            marker: {
                enabled: false,
                states: {
                    hover: {
                        enabled: true,
                        radius: 5
                    }
                }
            },
            shadow: false,
            states: {
                hover: {
                    lineWidth: 1
                }
            }
        }
    },
    tooltip: {
      pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change}%)<br/>',
      valueDecimals: 2
    },
    series: [
      {
        // type: 'area',
        name: inputData.name[0],
        // pointInterval: 24 * 3600 * 1000,
        // pointStart: Date.UTC(2006, 0, 01),
        data: inputData.data
      }
    ]
  });

}