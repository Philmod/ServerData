App.Models.User = Backbone.Model.extend({
  defaults : {
    name : null,
    password : null,
    systems : new Array
  },
  initialize : function() {
    console.log("initialize User");s
  }
});