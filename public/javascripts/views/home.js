App.Views.homeView = Backbone.View.extend({

  el: '.content',

  initialize: function() {
    this.template = _.template(tpl.get('home'));
  },

  events: {
    
  },

  render: function() {
    $(this.el).html(this.template());
  }

});
