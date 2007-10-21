// Define a namespace to encapsulate all WidgetJS Objects and Functions
var WJS = Class.create();

/*
  WJS.DOM is used to create, and manage the lifetime of widgets on a page, as well as provide utility methods
	for accessing the DOM. It holds state for the currently loaded page and exists only for the lifetime of a page..

  Before the DOM is loaded you can register selectors to annotate how your widgets body are located in the DOM.

	WJS.DOM.register("css-selector", WidgetClass);

*/
WJS.DOM = {
	initialize: function()
	{
		this.widgets = new Array();
    this.registry = new Hash(); // store registered widgets by class name
    this.widgetCount = 0;
    this.loaded = false;
    this.ensureQueue = new Array();
    this.readyQueue = new Array();
    this._initializeDOM();
	},
  _initializeDOM: function()
  {
    // detect DOM ready once for the whole page for each specific browser type
    if( Prototype.Browser.IE ){
      document.onreadystatechange = function(){
        if( document.readyState == "complete" ){
          this._notifyDOMLoaded();
          document.onreadystatechange = null;
        }
      }.bind(this);
    }
    else if( Prototype.Browser.WebKit ){// safari 2.0
      var _timer = setInterval(function() {
        if (/loaded|complete/.test(document.readyState)) {
          clearInterval(_timer);
          this._notifyDOMLoaded();
        }
      }.bind(this), 10);
    }
    else if( document.addEventListener ){
      document.addEventListener("DOMContentLoaded", this._notifyDOMLoaded.bind(this), false);
    }
  },
  _notifyDOMLoaded: function()
  {
    this.loaded = true;
    for( var i = 0, len = this.readyQueue.length; i < len; ++i ){
      this.readyQueue[i]();
    }
    for( var i = 0, len = this.ensureQueue.length; i < len; ++i ){
      this.ensureQueue[i]();
    }
  },
  // on page load or WJS.DOM.bind(document.body)
  // locate the cssSelector in the DOM and initialize a new widgetClass
	register: function(cssSelector, widgetClass)
  {
    if( !widgetClass.__widget_id ){
      widgetClass.__widget_id = this.widgetCount++;
    }
    var widgetId = widgetClass.__widget_id;
    var widgetRegistry = this.registry[widgetId];
    if( !widgetRegistry ){
      widgetRegistry = this.registry[widgetId] = {selectors:new Array(), klass: widgetClass};
    }
    widgetRegistry.selectors.push(cssSelector);
  },
  // remove the registered class and
  // call widgetClass.prototype.teardown for each instance created
  unregister: function(widgetClass)
  {
    if( !widgetClass.__widget_id ){
      return; // unregistered
    }
    this.registry[widgetClass.__widget_id] = null;
  },
  // search for all registered behaviors within element
  // and instantiate each widgetClass
  bind: function(element)
  {
    element = $(element || document.body);
    this.registry.each( function( pair ){
      var type = pair.value.klass;
      var typeId = pair.value.klass.__widget_id;
      var selectors = pair.value.selectors;
      var elements = element.getElementsBySelector(selectors);

      // reject elements that already have a widget of type, type
      elements = elements.reject( function(element){
        return this.findByElement(element).detect( function(widget){
          return widget.__widgetClassId == typeId;
        }.bind(this) );
      }.bind(this) );

      for( var i = 0, len = elements.length; i < len; ++i ){
        this.widgets.push( new type(elements[i], selectors, typeId) );
      }
    }.bind(this));
  },
  // release all widgets found as a childNode of element
  unbind: function(element)
  {
    this.registry.each( function( pair ){
      var type = pair.key;
      var elements = element.getElementsBySelector(pair.value);
      for( var i = 0, len = elements.length; i < len; ++i ){
        var element = elements[i];
        this.widgets = this.widgets.reject( function(widget){
          var matched = widget.element == element;
          if( matched && widget.teardown ){ widget.teardown(); }
          return matched;
        } );
      }
    }.bind(this));
  },
  //
  // unlike bind this can be called inline to the DOM and will bind to the nearest parentNode
  // of the embedded script.
  // usage:
  //
  //  <div>
  //   <ul class='tab'>
  //     <li><a href="/tab1">tab1</a></li>
  //     <li><a href="/tab2">tab2</a></li>
  //   </ul>
  //   <script>WJS.DOM.bindNow()</script>
  //  </div>
  //
  //  assuming we have a Widget registered to 'ul.tab'
  // e.g.
  //  WJS.DOM.register('ul.tab',MyTabWidget);
  //
  // before the DOM is fully loaded this will bind the widget
  //
  // The advantage to late binding is that once the markup is inside the browser
  // the javascript immediately becomes available.
  //
  // The advantage to inline event handlers i.e. 'onclick and onmouseover' is your
  // markup can more easily degrade, is less likely to be dependent on javascript,
  // and is smaller.
  // 
  // It's very important that if you use this method you always place your script tag at the
  // end of a div.
  //
  bindNow: function()
  {
    if( this.loaded ){ return; } // return if the dom is already loaded
    var id = "wjs-" + Math.random();
    // create a marker to attach a DOM operation, remember this is called before we have a full DOM tree
    document.write("<div id='" + id + "'></div>");
    this.bind($(id).parentNode);
  },
  // call method when the DOM is ready.
  // works as if there was a standard domready even e.g. Event.observe(window,"domready",method);
  ready: function(method)
  {
    if( !this.loaded ){
      this.readyQueue.push( method );
    }
  },
  // similar to ready except it will always call the method if the DOM is ready
  // where as ready is only called once when the event is fired. ensure is more like
  // a wrapper to ensure that the DOM is ready before the method is called, but it always
  // calls the method.
  ensure: function(method)
  {
    if( !this.loaded ){
      this.ensureQueue.push( method );
    }
    else{
      method();
    }
  },
  findBySelectors: function(cssSelectors)
  {
    var widgets = new Array();
    for( var i = 0, len = cssSelectors.length; i < len; ++i ){
      widgets.push( this.findBySelector( cssSelectors[i] ) );
    }
    return widgets.flatten();
  },
  // find all widgets created with cssSelector
  findBySelector: function(cssSelector)
  {
    return this.widgets.select( function(widget){ return widget.__selectors.include(cssSelector); } );
  },
  // find all widgets created of type widgetClass
  findByType: function(widgetClass)
  {
    var widgetRegistry = this.registry[widgetClass.__widget_id];
    if( widgetRegistry ){
      return this.findBySelectors( widgetRegistry.selectors );
    }
    else{
      return [];
    }
  },
  // return all widgetClass objects associated to the given element
  findByElement: function(element)
  {
    return this.widgets.select( function(widget){ return widget.element == element; } );
  }
};

// TODO: allow for on demand loading of widget code
WJS.Remote = {
};

// base class for all widgets
// constructor expects an element and a selector
WJS.Widget = Class.create();
Object.extend( WJS.Widget.prototype, {
  initialize: function( el, selectors, widgetClassId )
  {
    this.element = $($(el).cleanWhitespace());
    this.__selectors = $A(selectors);
    this.__widgetClassId = widgetClassId;
  }
} );

// static methods used for creating new widgets
Object.extend(WJS.Widget,{
  //
  // NewClass = WJS.Widget.create([selectors], [array of widgets to extend], {widget implementation});
  //
  create: function()
  {
    var klass = Class.create();
    var args = $A(arguments);

    // use all strings as selectors
    var selectors = args.select( function(arg){ return (typeof( arg ) == "string"); } );
    // use everything else as a Class
    var extendors = args.reject( function(arg){ return (typeof( arg ) == "string"); } );

    // add widget
    extendors.unshift( WJS.Widget );

    // remove duplicates
    extendors = extendors.uniq().reverse();

    // extended each prototype
    for( var i = 0; i < extendors.length - 1; ++i ){ Object.extend(klass.prototype,extendors[i].prototype); }
    Object.extend(klass.prototype, args.last() );

    // auto register this class to any selectors
    selectors.each( function(selector){ this.register( selector, klass ); }.bind(WJS.DOM) );

    return klass;
  }
});
WJS.DOM.initialize();
