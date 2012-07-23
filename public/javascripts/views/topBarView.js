App.Views.TopBarView = Backbone.View.extend({
  el: '.topbar',
  initialize: function() {
    this.template = _.template(tpl.get('header'));
    // return this.render();
  },
  render: function() {
    $(this.el).html(this.template({
      title: 'ServerData',
      links: [
        {
          desc: 'Home',
          id: 'linkHome',
          link: '#'
        }, {
          desc: 'Visualize',
          id: 'linkVisualize',
          link: '#visualize'
        }, {
          desc: 'Admin',
          id: 'linkAdmin',
          link: '#admin'
        }, {
          desc: 'Contact',
          id: 'linkContact',
          link: '#contact'
        }
      ]
    }));
    return $('ul.nav li').first().attr('class', 'active');
  }
});