///// GLOBAL VIEW /////
App.Views.AdminView = Backbone.View.extend({

	el: '.content',

	events: {
    "click #addUserSubmit": "addUserSubmit",
    "click #userAccessAddButton": "userAccessAddSystem",
    "click #userAccessRemoveButton": "userAccessRemoveSystem",
    "click #userAccessSubmit": "userAccessSubmit",
    "click #addSystemSubmit": "addSystemSubmit",
    "click #deleteSystemSubmit": "deleteSystemSubmit"
  },
  
  initialize: function() {
    this.template = _.template(tpl.get('admin'));
  },

  render: function() {
    $(this.el).html(this.template());
    App.Views.systemsDelView = new App.Views.SystemsView({el: $("#systemsDel"), collection: App.Collections.systems});
    App.Views.usersView = new App.Views.UsersView({el: $("#users"), collection: App.Collections.users});
    App.Views.allSystemsView = new App.Views.SystemsAccessView({el: $("#SystemsAll"), collection: App.Collections.systems});
    return this;
  },

  addUserSubmit: function(e) {
  	/// CHECK MAIL + PASSWORDS
  	var errors = null;
  	if ($("#userAddForm: #password").val() !== $("#userAddForm: #passwordBis").val()) errors = 'The two passwords are not the same'; 
  	if ($("#userAddForm: #password").val().length < 8) errors = 'The password length must be at least 8 characters'; 
  	var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  	if (!filter.test($("#userAddForm: #email").val())) errors = 'Please provide a valid email address';

  	if (errors && errors!='') {
			$('#myModal').children('.modal-body').text(errors);
			$('#myModal').modal('show');
		}
		else {
			App.Socket.emit('addWebUser', {
	  		user: App.Models.user.getData(),
	  		form: JSON.stringify($("#userAddForm").serializeObject())
	  	});
		}
  },

  userAccessAddSystem: function(e) {
    if ($("#userAccessForm: #users").val()!='') {
      // ADD, but after checking if this element doesn't already exist in the box
      $('#SystemsAll :selected').each(function(i, selected) {
        var bool = false; // is the selected option already exists in the authorized systems?
        $('#SystemsAuthorized option').each(function(i, auth) {
          if ($(selected).text() === $(auth).text()) bool = true;
        });
        if (!bool) {
          $('#SystemsAuthorized').append(new Option($(selected).text(),$(selected).val(),false,false)); // append an option
          $("#SystemsAll ").find('option').removeAttr("selected"); // clear selected attributes
        }
      });
    }
    else {
      $('#myModal').children('.modal-body').text('First choose a user');
      $('#myModal').modal('show');
    }
  },
  userAccessRemoveSystem: function(e) {
    $("#SystemsAuthorized :selected").remove();
  },
  userAccessSubmit: function() {
    var errors = null;
    if ($("#userAccessForm: #passwordNew").val() !== $("#userAccessForm: #passwordNewBis").val()) errors = 'The two passwords are not the same'; 
    if ($("#userAccessForm: #passwordNew").val().length!=0 && $("#userAccessForm: #passwordNew").val().length < 8) errors = 'The password length must be at least 8 characters'; 
    if (errors && errors!='') {
      $('#myModal').children('.modal-body').text(errors);
      $('#myModal').modal('show');
    }
    else {
      // here we deal with the models of the collection
      App.Collections.users.getByCid($("#userAccessForm: #users").val()).changeSystemsAuth($('#SystemsAuthorized option'));
    }
  },

  addSystemSubmit: function(e) {
  	/// PASSWORDS
  	var errors = null;
  	if ($("#systemAddForm: #passwordSys").val() !== $("#systemAddForm: #passwordSysBis").val()) errors = 'The two passwords are not the same'; 
  	if ($("#systemAddForm: #passwordSys").val().length < 8) errors = 'The password length must be at least 8 characters'; 
  	if ($("#systemAddForm: #login").val().length < 5) errors = 'The login length must be at least 5 characters'; 

  	if (errors && errors!='') {
			$('#myModal').children('.modal-body').text(errors);
			$('#myModal').modal('show');
		}
		else {
			App.Socket.emit('addSystemUser', {
	  		user: App.Models.user.getData(),
	  		form: JSON.stringify($("#systemAddForm").serializeObject())
	  	});
		}
  },

  deleteSystemSubmit: function(e) {
    var answer = confirm('Do you really want to delete this system?');
    if (answer) {
      App.Collections.systems.remove($("#systemDeleteForm: #systemsDel").val())
      App.Views.systemsDelView.repopulate(); // clear the Select form and re-add the whole collection
    }
  }

});
///////////////////////

///// USERS VIEW /////
App.Views.UserView = Backbone.View.extend({
  tagName: "option",

  initialize: function(){
    _.bindAll(this, 'render');
  },
  render: function(){
    $(this.el).attr('value', this.model.cid).html(this.model.get('email'));
    return this;
  }
});
App.Views.UsersView = Backbone.View.extend({
  
  events: {
    "change": "changeSelected"
  },

  initialize: function(){
    _.bindAll(this, 'addOne', 'addAll', 'reset');
    this.collection.bind('reset', this.reset);
    this.collection.bind('add', this.addOne);
    this.addAll();
  },

  addOne: function(user){
    var userView = new App.Views.UserView({ model: user });
    if (!this.usersViews) this.usersViews = [];
    this.usersViews.push(userView);
    $(this.el).append(userView.render().el);
  },

  addAll: function(){
    this.collection.each(this.addOne);
  },

  reset: function(){
    _.each(this.usersViews, function(userView) { userView.remove() });
    this.usersView = [];
    // if (this.variablesView) this.variablesView.reset();
  },

  repopulate: function(){
    this.reset();
    this.addAll();
  },

  changeSelected: function(){
    this.setSelected($(this.el).val());
  },

  setSelected: function(userCid){
    this.systemsAccessView = new App.Views.SystemsAccessView({el: $("#SystemsAuthorized"), collection: this.collection.getByCid(userCid).systems});
  }

});
//////////////////////

///// SYSTEMS (associated with user) VIEW /////
App.Views.SystemAccessView = Backbone.View.extend({
  tagName: "option",

  initialize: function(){
    _.bindAll(this, 'render');
  },

  render: function(){
    $(this.el).attr('value', this.model.cid).html(this.model.get('name'));
    return this;
  }

});

App.Views.SystemsAccessView = Backbone.View.extend({

  initialize: function(){
    _.bindAll(this, 'addOne', 'addAll');
    this.addAll();
  },

  addOne: function(system){
    var systemAccessView = new App.Views.SystemAccessView({ model: system });
    $(this.el).attr('disabled', false);
    $(this.el).append(systemAccessView.render().el);
  },

  addAll: function(){
    this.reset();
    this.collection.each(this.addOne);
  },

  reset: function(){
    $(this.el).empty(); //.append('<option selection="selection" value="">Select one variable</option>')
    $(this.el).attr('disabled', true);
  }

});
///////////////////////////////////////////////