
$(function() {
	tpl.loadTemplates(['home', 'about', 'contact', 'header', 'visualize', 'login', 'loggedIn','admin'],
    function () {
      App.router = new App.Router;
      App.Socket.connect();
	  	return Backbone.history.start();
    }
  );
});
