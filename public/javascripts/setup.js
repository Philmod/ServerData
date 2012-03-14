
$(function() {
	tpl.loadTemplates(['home', 'about', 'contact', 'header', 'visualize'],
    function () {
        App.router = new App.Router;
 			  return Backbone.history.start();
    }
  );
});
