App.Models.Variable = Backbone.Model.extend({
  defaults : {
    name : '',
    unit: '',
    desc : '',
    datas : new Array(),
    alarms: new Array()
  },
  initialize : function() {
    // console.log("initialize Variable");
  }
});

App.Collections.Variables = Backbone.Collection.extend({
	model: App.Models.Variable
});



App.Models.System = Backbone.Model.extend({
  defaults : {
    name : ''
  },
  initialize : function() {
    var self = this;
    var variables = self.get('variables');

    self.variables = new App.Collections.Variables(); // Create the Variables Collection inside the System Model

    _.each(variables, function(value,key) {
      try { value = JSON.parse(value); }
      catch(err) { }
      if (typeof value == 'object') value.name = key;
      else value = {name: key};
      self.variables.add(new App.Models.Variable( value )); // Create the Variable Model in the Variables Collection
    });

  }
});

App.Collections.Systems = Backbone.Collection.extend({
	
  model: App.Models.System,

  initialize: function(){
    this.bind('remove', this.onRemove);
  },

  onRemove: function(e) {
    App.Socket.emit('deleteSystem', {
      user: App.Models.user.getData(),
      form: JSON.stringify({system: e.get('name')})
    });
  }

});

// App.Collections.systems.at(2).variables.at(0).get('desc') // Get the 1st variable's description of the 3rd system