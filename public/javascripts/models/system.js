App.Models.System = Backbone.Model.extend({
  defaults : {
    name : null,
    variables : null,
    desc : null
  },
  initialize : function() {
    console.log("initialize System");
  }
});