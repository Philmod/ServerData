
$(function() {
	tpl.loadTemplates(['home', 'about', 'contact', 'header', 'visualize', 'login'],
    function () {
      App.router = new App.Router;
      App.socket.connect();
	  	return Backbone.history.start();
    }
  );
});
