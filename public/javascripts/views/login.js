App.Views.LoginView = Backbone.View.extend({

	el: '.content',

  events: {
    "click #login": "loginSubmit",
    "change #username": "usernameChange",
    "change #password": "passwordChange"
  },

  initialize: function () {
  	this.template = _.template(tpl.get('login'));
    _.bindAll(this, 'usernameChange', 'passwordChange', 'loginSubmit');
  },

  usernameChange: function(event) {
    // this.model.set({ username: $(event.currentTarget).val() });
  },

  passwordChange: function(event) {
    // this.model.set({ password: $(event.currentTarget).val() });
  },	

  loginSubmit: function(event) {
    // alert("You have logged in as '" + this.model.get('username') + "' and a password of '" + this.model.get('password') + "'");
    // return false;
    App.socket.emit('login', { log: 'V2I_MOD' });

  },

  render: function() {
    return $(this.el).html(this.template());
  }

});