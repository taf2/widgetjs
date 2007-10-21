// Sample Container Widget
// This is a generic widget that acts as a container that can float over
// any part of the main window.

WJS.Container = WJS.Widget.create("div.wjs-container", {
  initialize: function()
  {
    WJS.Widget.prototype.initialize.apply(this,arguments);
    WJS.DOM.ensure( this.activate.bind(this) );
  },
  activate: function()
  {
    this.element = this.element.remove();
    document.body.appendChild( this.element );
    this.element.style.position = "absolute";
    this.element.style.top = "0px";
    this.element.style.left = "0px";
    this.element.style.zIndex = 100;;
  }

});
