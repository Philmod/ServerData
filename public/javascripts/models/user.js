// USER
App.Models.User = Backbone.Model.extend({

  defaults : {
    email : 'philippe.modard@gmail.com',
    password : '',
    loggedIn: false,
    systems : new Array
  },

  initialize : function() {
    console.log("initialize User");
  },

  login: function(){
  	console.log('MODELS User login');
  	
    App.Socket.emit('login',{
      email: this.get('email'),
      password: this.get('password')
    });

  	
    /*var self = this;
    $.post("/user/login", 
      this.toJSON(),
      function(data){
        if (data.loggedIn){
          self.trigger("loggedIn", self);
        }
      }
    );*/
		
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