// ComboBox Widget
// 
// Convert a regular select element into a combobox widget
//
WJS.ComboBox = WJS.Widget.create("select.wjs-combo", {
  initialize: function(el)
  {
    WJS.Widget.prototype.initialize.apply(this,arguments);
    var parent = this.element.up();
    this.container = $(document.createElement("div"));
    this.input = $(document.createElement("input"));
    parent.replaceChild(this.container,this.element);
    this.container.appendChild(this.element);
    this.container.appendChild(this.input);
    this.input.hide();
    Event.observe(this.element,"click",this.edit.bindAsEventListener(this));
  },
  edit: function(e)
  {
    Position.prepare();

    var dims = this.element.getDimensions();
    var xptr = Event.pointerX(e);
    var yptr = Event.pointerY(e);
    var offset = Position.cumulativeOffset(this.element);
    var clickerDim = dims.height; // the clicker dimensions are the arrow box so the height in width and in height  

    if( xptr > (offset.first()+dims.width-clickerDim) &&
        xptr < (offset.first()+dims.width) ){
      console.debug("in bounds");
      // 
    }
    else {
      // show the input field
      console.debug("out of bounds");
      this.element.hide();
      this.input.show();
      this.input.focus();
      this.input.style.width = dims.width + "px";
      Event.observe(this.input,"blur",this.reset.bindAsEventListener(this));
      Event.stop(e);
    }

  },
  reset: function()
  {
    this.element.show();
    this.input.hide();
  }

});
