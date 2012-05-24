
window.App = {
  Collections: {},
  Models: {},
  Views: {},
  Socket: {}
};

App.Router = Backbone.Router.extend({
  routes: {
    "": "home",
    "visualize": "visualize",
    "about": "about",
    "contact": "contact"
  },

  initialize: function() {
    App.Collections.systems = new App.Collections.Systems; // Create the systems Collection
    //// header View ////
    App.Views.topBarView = new App.Views.TopBarView();
    App.Views.topBarView.render();
    /////////////////////

    //// LOGIN FORM in the header////
    if (!App.Views.loginView) {
      App.Models.user = new App.Models.User;
      App.Views.loginView = new App.Views.LoginView({model: App.Models.user});
    }
    App.Views.loginView.render();
    /////////////////////////////////
  },

  visualize: function() {
    if (!App.Views.visualizeView) {
      App.Views.visualizeView = new App.Views.VisualizeView();
    }
    App.Views.visualizeView.render();
  },

  home: function() {
    if (!App.Views.homeView) {
      App.Views.homeView = new App.Views.HomeView();
    }
    App.Views.homeView.render();
  },

  about: function() {
    if (!App.Views.aboutView) {
      App.Views.aboutView = new App.Views.AboutView();
    }
    App.Views.aboutView.render();
  },

  contact: function() {
    if (!App.Views.contactView) {
      App.Views.contactView = new App.Views.ContactView();
    }
    App.Views.contactView.render();
  }

});

App.Socket = {
  a: null,

  provider: io.connect(host),

  onConnect: function () {
    App.Socket.emit('isLogged'); // check if this session is a logged user
  },

  onError: function (e) {
    alert('ERROR : ' + e);
    console.log('ERROR : ' + e);
    console.log('%o',e);
  },

  onMessage: function (e) {
    console.log('SOCKET MESSAGE : ' + e);
    console.log('%o',e);
  },

  onDisconnect: function () {
    setInterval(App.Socket.connect, 300)
  },

  onGetDatas: function(e) {
    if (!App.Views.graph) App.Views.graph = new App.Views.Graph({ el: "#chart1" });
    App.Views.graph.addSeries(e);
  },

  onLogin: function(e) {
    App.Models.user.set({
      email: e.email,
      loggedIn: e.loggedIn
    });
    // Add the systems, and the variables nested
    App.Collections.systems.reset(); 
    for (var sys in e.systems) {
      App.Collections.systems.add(new App.Models.System({ name: sys, variables: e.systems[sys] }));
    }
  },

  connect: function () {
    a = App.Socket.provider;
    if (a.connected) {
        return
    }
    a.on("connect", App.Socket.onConnect);
    a.on("error", App.Socket.onError);
    a.on("message", App.Socket.onMessage);
    a.on("disconnect", App.Socket.onDisconnect);
    a.on("getDatas", App.Socket.onGetDatas);
    a.on('login', App.Socket.onLogin);
  },

  emit: function(type,data) {
    a.emit(type,data);
  }

};
