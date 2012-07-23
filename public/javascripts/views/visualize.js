App.Views.VisualizeView = Backbone.View.extend({

	el: '.content',

  events: {
    "click #downloadSubmit": "downloadSubmit"
  },
  
  initialize: function() {
		this.template = _.template(tpl.get('visualize'));
  },

  render: function() {
		$(this.el).html(this.template());
  	App.Views.systemsView = new App.Views.SystemsView({el: $("#systems"), collection: App.Collections.systems}); // had to wait the #systems tag rendered
		return this;
  },

  downloadSubmit: function() {
    var variablesCid = $("#visualizeForm: #variables").val(),
      variablesName = [];
    for (var i=0; i<variablesCid.length; i++) {
      variablesName[i] = App.Collections.systems.getByCid($("#visualizeForm: #systems").val()).variables.getByCid(variablesCid[i]).get('name');
    }
    if (variablesCid.length!=1) {
      $('#myModal').children('.modal-body').text('You have to select ONE variable');
      $('#myModal').modal('show');
    }
    else {
      window.location = '../download/' + App.Collections.systems.getByCid($("#visualizeForm: #systems").val()).get('name') + '/' + variablesName[0];
    }
  }

});


///// SYSTEM(s) //////
App.Views.SystemView = Backbone.View.extend({
	tagName: "option",

	initialize: function(){
		_.bindAll(this, 'render');
	},
	render: function(){
		$(this.el).attr('value', this.model.cid).html(this.model.get('name'));
		return this;
	}
});
App.Views.SystemsView = Backbone.View.extend({
	
	events: {
		"change": "changeSelected"
	},

	initialize: function(){
		_.bindAll(this, 'addOne', 'addAll', 'reset');
		this.collection.bind('reset', this.reset);
		this.collection.bind('add', this.addOne);
		this.addAll();
	},

	addOne: function(system){
		var systemView = new App.Views.SystemView({ model: system });
		if (!this.systemsViews) this.systemsViews = [];
    this.systemsViews.push(systemView);
    $(this.el).append(systemView.render().el);
	},

	addAll: function(){
		this.collection.each(this.addOne);
	},

	reset: function(){
		_.each(this.systemsViews, function(systemView) { systemView.remove() });
		this.systemsViews = [];
		if (this.variablesView) this.variablesView.reset();
	},

  repopulate: function(){
    this.reset();
    this.addAll();
  },

	changeSelected: function(){
		this.setSelected($(this.el).val());
	},

	setSelected: function(systemCid){
		this.variablesView = new App.Views.VariablesView({el: $("#variables"), collection: this.collection.getByCid(systemCid).variables});
	}

});

//////////////////////


///// VARIABLE(s) //////
App.Views.VariableView = Backbone.View.extend({
	tagName: "option",

	initialize: function(){
		_.bindAll(this, 'render');
	},

	render: function(){
		$(this.el).attr('value', this.model.cid).html(this.model.get('name'));
		return this;
	}

});

App.Views.VariablesView = Backbone.View.extend({

	events: {
		"change": "changeSelected"
	},

	initialize: function(){
		_.bindAll(this, 'addOne', 'addAll');
		this.addAll();
	},

	addOne: function(variable){
		var variableView = new App.Views.VariableView({ model: variable });
    $(this.el).attr('disabled', false);
    $(this.el).append(variableView.render().el);
	},

	addAll: function(){
		this.reset();
		this.collection.each(this.addOne);
	},

	reset: function(){
		$(this.el).empty(); //.append('<option selection="selection" value="">Select one variable</option>')
		$(this.el).attr('disabled', true);
	},

	changeSelected: function(){
		// The user has selected the system and variable(s)
    App.Models.user.set({systemSelected: $("#systems").find('option:selected').text()});

    var textvalues = [];
    $('#variables :selected').each(function(i, selected) {
        textvalues[i] = $(selected).text();
    });
		App.Models.user.set({variablesSelected: textvalues });
		App.Socket.emit('getDatas', { sys: App.Models.user.get('systemSelected'), variables: App.Models.user.get('variablesSelected') });
	}

});

////////////////////////


///// GRAPH VIEW /////
App.Views.Graph = Backbone.View.extend({

	initialize: function() {
		this.chart = createChart(this.el, null);
	},

	setInfos: function(system, variable) {
		this.chart.setTitle({ text: system }); // App.Models.user.get('systemSelected')
		//this.chart.yAxis[0].setTitle({ text: variable });

		//// TODO: ajouter la description et l'unité de l'axe en fonction de App.Collections.systems ...

	},

	addSeries: function(ss) {
    var self = this,
      maxLength = 0;
    ss.forEach(function(s) {
      if (s.data.length > maxLength)
        maxLength = s.data.length;
    });
		if (maxLength==0) {
      $('#modal-header-text').text('Error');
      $('#myModal').children('.modal-body').text('No datas in this range');
      $('#myModal').modal('show');
    }
    else {
			this.removeAll();
			ss.forEach(function(s) {self.addSerie(s)})
		}
		this.chart.hideLoading();
	},

	addSerie: function(s) {
		this.chart.addSeries({
			id: s.system+':'+s.variable, // App.Views.graph.chart.get(id)
			name: s.variable,
			data: s.data
		})
		this.setInfos(s.system, s.variable);
	},

	addPoint: function() {

	},

	removeAll: function() {
		while(this.chart.series.length > 0)	this.chart.series[0].remove(false);
    this.chart.redraw();
	},

	render: function() {

	}

})
//////////////////////

// The selection event handler
function selection(event) {
  var chart = this;

  if (event.xAxis) {
    var xAxis = event.xAxis[0],
    min = xAxis.min,
    max = xAxis.max;

    if (max - min < 10*60000) max = min + 10*60000; // at least 10 min
          
    // indicate to the user that something's going on
    chart.showLoading();
    
    // request the data - see http://api.jquery.com/jQuery.get/
    console.log('start = ' + min + ' , end : ' + max);
    App.Socket.emit('getDatas', { sys: App.Models.user.get('systemSelected'), variables: App.Models.user.get('variablesSelected'), start: min, end: max });
    
    return false;
  }
}

function createChart(el,inputData) {
	if (inputData==null) var inputData = {};
  var chart = new Highcharts.Chart({
    chart: {
        renderTo: el,
        zoomType: 'x',
        spacingRight: 20,
        events: {
          selection: selection
        }
    },
    title: {
        text: inputData.title || null
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
            text: inputData.yTitle || null
        },
        startOnTick: false,
        showFirstLabel: false,
        endOnTick: true
        /*plotBands : [{
          from : 12.6738,
          to : 15,
          color : 'rgba(68, 170, 213, 0.2)',
          label : {
            text : 'Bande de couleur, ca peut servir pour alarmes & co!'
          }
        }]*/
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
      xDateFormat: '%A, %Y-%m-%d, %H:%MZ',
      pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> <br/>',
      valueDecimals: 4
    },
    series: [
      {
        name: inputData.name || null,
        data: inputData.data || null
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
      App.Socket.emit('getDatas', { sys: App.Models.user.get('systemSelected'), variables: App.Models.user.get('variablesSelected') });
    })
    .appendTo(chart.container);

   return chart;

}