// USER
App.Models.User = Backbone.Model.extend({

  defaults : {
    email : '',
    password : '',
    loggedIn: false,
    systems : new Array
  },

  initialize : function() {
    console.log("initialize User");
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


App.Collections.Users = Backbone.Collection.extend({
	model: App.Models.User
});


/*// LOGIN STATUs
App.Models.LoginStatus = Backbone.Model.extend({

    defaults: {
        loggedIn: false,
        apiKey: null
    },

    initialize: function () {
        this.bind('change:apiKey', this.onApiKeyChange, this);
        this.set({'apiKey': localStorage.getItem('apiKey')});
    },

    onApiKeyChange: function (status, apiKey) {
        this.set({'loggedIn': !!apiKey});
    },

    setApiKey: function(apiKey) {
        localStorage.setItem('apiKey', apiKey)
        this.set({'apiKey': apiKey});
    }

});*/