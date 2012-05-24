// USER
App.Models.User = Backbone.Model.extend({

  defaults : {
    email : '',
    password : '',
    loggedIn: false,
    systems : new Array,
    systemSelected: '',
    variablesSelected: ''
  },

  initialize : function() {
    //console.log("initialize User");
  },

  login: function(){
    App.Socket.emit('login',{
      email: this.get('email'),
      password: this.get('password')
    });
  },

  logOut: function() {
    this.set({
      loggedIn: false,
      email: null,
      password: null
    });
    App.Socket.emit('logOut');
  },

  loggedIn: function(){
    console.log('LOGGED IN !!');
  }

});
