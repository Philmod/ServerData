App.Views.LoginView = Backbone.View.extend({

	el: "#loginLI", 

  events: {
    "click #loginButton": "developLoginform",
    "click #logOutButton": "logOut"
  },

  initialize: function () {
    this.model.bind('change:loggedIn', this.render, this);

  	this.templateNotLogged = _.template(tpl.get('login'));
    this.templateLoggedIn = _.template(tpl.get('loggedIn'));
    _.bindAll(this, 'developLoginform','loginSubmit');
  },

  developLoginform: function(e) { // develop the login form
    var self = this;
    $("#loginform").slideDown(250,function(){
      $("#email").focus();
      $('html').click(function() {
         $("#loginform").slideUp(200,function(){
            $('html').unbind('click');
            $("#loginform").unbind('click');
            $("#loginButton").toggleClass('clicked');
         });
      });
      $('#loginform').click(function(event){
        event.stopPropagation();
      });
      $("#loginSubmit").on('click', self.loginSubmit);
    });
    $(self).toggleClass('clicked');
  },

  loginSubmit: function(event) {
    event.preventDefault();
    this.model.set({
      email: $("#email").val(),
      password: $("#password").val()
    });
    this.model.login();    
  },

  logOut: function() {
    this.model.logOut();
    App.Collections.systems.reset();
  },

  render: function() {
    if (this.model.get('loggedIn')){ 
      $(this.el).empty().append(this.templateLoggedIn(this.model));
    } else {
      $(this.el).empty().append(this.templateNotLogged(this.model));
    }
    return this;
  }

});