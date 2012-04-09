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
          link: '#'
        }, {
          desc: 'Visualize',
          link: '#visualize'
        }, {
          desc: 'About',
          link: '#about'
        }, {
          desc: 'Contact',
          link: '#contact'
        }
      ]
    }));
    return $('ul.nav li').first().attr('class', 'active');
  }
});