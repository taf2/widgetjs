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
	},
  // on page load or WJS.DOM.bind(document.body)
  // locate the cssSelector in the DOM and initialize a new widgetClass
	register: function(cssSelector, widgetClass)
  {
    this.registry[widgetClass] ||= new Array();
    this.registry[widgetClass].push(cssSelector);
  },
  // remove the registered class and 
  // call widgetClass.prototype.teardown for each instance created
  unregister: function(widgetClass)
  {
    this.registry[widgetClass] = null;
  },
  // search for all registered behaviors within element
  // and instantiate each widgetClass 
  bind: function(element)
  {
    this.registry.each( function( pair ){
      var type = pair.key;
      var selector = pair.value;
      var elements = element.getElementsBySelector(selector);
      for( var i = 0, len = elements.length; i < len; ++i ){
        this.widgets.push( new type(elements[i], selector) );
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
        });
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
  bindNow: function()
  {
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
    return this.widgets.select( function(widget){ return widget.selectors.include(cssSelector); } );
  },
  // find all widgets created of type widgetClass
  findByType: function(widgetClass)
  {
    return this.findBySelectors( this.registry[widgetClass] );
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
  initialize: function( el, selector )
  {
    this.element = $(el).cleanWhitespace();
    this.selector = selector;
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
    var selectors = args.select( function(arg){ return arg instanceOf(String); } );
    // use everything else as a Class
    var extendors = args.reject( function(arg){ return arg instanceOf(String); } );

    // add widget
    extendors.unshift( WJS.Widget );

    // remove duplicates
    extendors = extendors.uniq();

    // save the last one to extend outside the loop without the prototype
    var len = extendors.length -1;

    // extended each prototype
    for( var i = 0; i < len; ++i ){ Object.extend(klass.prototype,extendors[i].prototype); }

    // add the class implementation
    Object.extend(klass.prototype,args[len]);

    return klass;
  }
});
