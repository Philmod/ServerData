
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
    "contact": "contact",
    "admin": "admin"
  },

  initialize: function() {

    $('body').loading(true, { // Loading
      align: 'center',
      pulse: 'working fade',
      text: '',
      mask: false,
      img: '/img/gif-loading.gif'
    });

    App.Collections.systems = new App.Collections.Systems; // Create the systems Collection
    App.Collections.users = new App.Collections.Users; // Create the users Collection (admin)
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

  /*about: function() {
    if (!App.Views.aboutView) {
      App.Views.aboutView = new App.Views.AboutView();
    }
    App.Views.aboutView.render();
  },*/

  contact: function() {
    if (!App.Views.contactView) {
      App.Views.contactView = new App.Views.ContactView();
    }
    App.Views.contactView.render();
  },

  admin: function() {
    if (App.Models.user && App.Models.user.get('admin')) {
      if (!App.Views.adminView) {
        App.Views.adminView = new App.Views.AdminView();
      }
      App.Views.adminView.render();
    }
    else {
      this.home(); // redirection
      //window.location = '../';
      $('#myModal').children('.modal-body').text('You have no access to this section');
      $('#myModal').modal('show');
    }
  }

});

App.Socket = {
  a: null,

  provider: io.connect(host),

  onConnect: function () {
    App.Socket.emit('isLogged'); // check if this session is a logged user
  },

  onError: function (e) {
    //// MODAL View ////
    $('#modal-header-text').text('Error');
    $('#myModal').children('.modal-body').text(e);
    $('#myModal').modal('show');
    ////////////////////
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
      loggedIn: e.loggedIn,
      admin: e.admin
    });
    // Add the systems, and the variables nested
    App.Collections.systems.reset(); 
    for (var sys in e.systems) {
      App.Collections.systems.add(new App.Models.System({ name: sys, variables: e.systems[sys] }));
    }
    // If admin, add the users and systems authorized
    if (e.admin) {
      App.Collections.users.reset(); 
      for (var user in e.users) {
        App.Collections.users.add(new App.Models.UserLight({ email: user, systems: e.users[user] }));
      }
    }
    $('body').loading(false);
  },

  onAdminSuccess: function(e) {
    onSuccess(e); // success message
    $('#userAddForm').clearForm(); // clear form
    $('#systemAddForm').clearForm(); // clear form
    $('#systemDeleteForm').clearForm(); // clear form
    $('#userAccessForm').clearForm(); // clear form
    $('#SystemsAuthorized option'). each(function(i,o) { $(o).remove(); })
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
    a.on('onAdminSuccess', App.Socket.onAdminSuccess);
  },

  emit: function(type,data) {
    a.emit(type,data);
  }

};


function onSuccess(message) { // Display a success message
  console.log('message onSuccess : ' + message);
  //// MODAL View ////
  $('#modal-header-text').text('Success');
  $('#myModal').children('.modal-body').text(message);
  $('#myModal').modal('show');
  ////////////////////
}

