App.Views.VisualizeView = Backbone.View.extend({

	el: '.content',
  
  initialize: function() {
    this.template = _.template(tpl.get('visualize'));
  },

  render: function() {
    return $(this.el).html(this.template());
  },

});