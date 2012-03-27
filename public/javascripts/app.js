
window.App = {
  Collections: {},
  Models: {},
  Views: {},
  socket: {}
};

App.Router = Backbone.Router.extend({
  routes: {
    "": "home",
    "visualize": "visualize",
    "about": "about",
    "contact": "contact",
    "login": "login"
  },

  initialize: function() {
    App.Views.topBarView = new App.Views.topBarView;
    App.Views.topBarView.render();
  },

  visualize: function() {
    if (!App.Views.visualizeView.render) {
      App.Views.visualizeView = new App.Views.visualizeView();
    }
    resetSelection(); 
    App.Views.visualizeView.render();
  },

  home: function() {
    if (!App.Views.homeView.render) {
      App.Views.homeView = new App.Views.homeView();
    }
    App.Views.homeView.render();
  },

  about: function() {
    if (!App.Views.aboutView.render) {
      App.Views.aboutView = new App.Views.aboutView();
    }
    App.Views.aboutView.render();
  },

  contact: function() {
    if (!App.Views.contactView.render) {
      App.Views.contactView = new App.Views.contactView();
    }
    App.Views.contactView.render();
  },

  login: function() {
    if (!App.Views.LoginView.render) {
      App.Views.LoginView = new App.Views.LoginView();
    }
    App.Views.LoginView.render();
  }

});

App.socket = {
  a: null,

  provider: io.connect(host),

  onConnect: function () {},

  onMessage: function (e) {
    console.log('SOCKET MESSAGE : ' + e);
    console.log('%o',e);
  },

  onDisconnect: function () {
    setInterval(App.socket.connect, 300)
  },

  onGetDatas: function(e) {
    console.log('SOCKET getDatas : ' + e);
    console.log('%o',e);
    createChart(e);
  },

  connect: function () {
    a = App.socket.provider;
    if (a.connected) {
        return
    }
    a.on("connect", App.socket.onConnect);
    a.on("message", App.socket.onMessage);
    a.on("disconnect", App.socket.onDisconnect);
    a.on("getDatas", App.socket.onGetDatas)
  },

  emit: function(type,data) {
    a.emit(type,data);
  }

};



function createChart(inputData) {
  chart = new Highcharts.Chart({
    chart: {
        renderTo: 'chart1',
        zoomType: 'x',
        spacingRight: 20,
        events: {
          selection: selection
        }
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

  chart.$resetButton = $('<button class=\'btn btn-primary\'>Reset view</button>')
    .css({
      position: 'absolute',
      top: '20px',
      right: '50px',
      zIndex: 20
    })
    .click(function() {
      resetSelection(chart)
    })
    .appendTo(chart.container);

}



// The selection event handler
function selection(event) {
  var chart = this;

  if (event.xAxis) {
    var xAxis = event.xAxis[0],
    min = xAxis.min,
    max = xAxis.max;

    if (max - min < 10*60000) // at least 10 min
      max = min + 10*60000;
    
    // indicate to the user that something's going on
    chart.showLoading();
    
    // request the data - see http://api.jquery.com/jQuery.get/
    App.socket.emit('getDatas', { sys: 'sysTest', variable: 'cpu2', start: min, end: max });
    
    return false;
  }

}

// Reset to normal view
function resetSelection(chart) {
  var date = new Date().getTime(),
    start = date-1000*3600*24*365*30,
    end = date+1000*3600*24*365*1;
  console.log('#visualize : ' + start + ' - ' + end);
  App.socket.emit('getDatas', { sys: 'sysTest', variable: 'cpu2', start: start, end: end });
}