App.Views.aboutView = Backbone.View.extend({

	el: '.content',
  
  initialize: function() {
    this.template = _.template(tpl.get('about'));
  },

  render: function() {
    return $(this.el).html(this.template());
  }

});