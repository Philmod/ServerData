
window.App = {
  Collections: {},
  Models: {},
  Views: {}
};

App.Router = Backbone.Router.extend({
  routes: {
    "": "home",
    "visualize": "visualize",
    "about": "about",
    "contact": "contact"
  },

  initialize: function() {
    App.topBarView = new App.topBarView;
    App.topBarView.render();
  },

  visualize: function() {
    if (!App.visualizeView.render) {
      App.visualizeView = new App.visualizeView();
    }
    App.visualizeView.render();
  },

  home: function() {
    if (!App.homeView.render) {
      App.homeView = new App.homeView();
    }
    App.homeView.render();
  },

  about: function() {
    if (!App.aboutView.render) {
      App.aboutView = new App.aboutView();
    }
    App.aboutView.render();
  },

  contact: function() {
    if (!App.contactView.render) {
      App.contactView = new App.contactView();
    }
    App.contactView.render();
  }

});
