App.contactView = Backbone.View.extend({

	el: '.content',
  
  initialize: function() {
    this.template = _.template(tpl.get('contact'));
  },

  render: function() {
    return $(this.el).html(this.template());
  }

});