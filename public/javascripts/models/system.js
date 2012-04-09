App.Models.System = Backbone.Model.extend({
  defaults : {
    name : '',
    variables : new Array(),
    desc : ''
  },
  initialize : function() {
    console.log("initialize System");
  }
});

App.Collections.Systems = Backbone.Collection.extend({
	model: App.Models.System
});