// USER
App.Models.User = Backbone.Model.extend({

  defaults : {
    email : '',
    password : '',
    loggedIn: null,
    systems : new Array,
    systemSelected: '',
    variablesSelected: '',
    admin: null
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
      password: null,
      admin: false
    });
    App.Socket.emit('logOut');
  },

  loggedIn: function() {
    console.log('LOGGED IN !!');
  },

  getData: function() {
    return {
      email: this.get('email'),
      password: this.get('password')
    };
  }

});


///// UserLight is used to list the users and systems linked /////
App.Models.UserLight = Backbone.Model.extend({

  defaults : {
    email : ''
  },

  initialize : function() {
    //console.log("initialize User");
    var self = this;
    var systems = self.get('systems');

    self.systems = new App.Collections.Systems(); // Create the Variables Collection inside the System Model

    _.each(systems, function(value,key) {
      try { value = JSON.parse(value); }
      catch(err) { }
      if (typeof value == 'object') value.name = value;
      else value = {name: value};
      self.systems.add(new App.Models.System( value )); // Create the Variable Model in the Variables Collection
    });
  },

  changeSystemsAuth: function(systemsAuth) {
    var self = this;
    this.systems.reset();
    systemsAuth.each(function(i, sys) {
      self.systems.add(new App.Models.System( {name: $(sys).text()} ));
    })
    this.updateToServer()
  },

  updateToServer: function() {
    console.log('user.js : updateToServer')
    var sysAuth = new Array();
    $('#SystemsAuthorized option').each(function(i, auth) {
      sysAuth.push($(auth).text());
    });
    // send via socket
    var data = {
      user: App.Collections.users.getByCid($("#userAccessForm: #users").val()).get('email'),
      sysAuth: sysAuth,
      passwordNew: $("#userAccessForm: #passwordNew").val(),
      passwordNewBis: $("#userAccessForm: #passwordNewBis").val()
    }
    App.Socket.emit('modifyWebUser', {
      user: App.Models.user.getData(),
      form: JSON.stringify(data)
    });
  }

});

App.Collections.Users = Backbone.Collection.extend({
  
  model: App.Models.UserLight

});
//////////////////////////////////////////////////////////////////