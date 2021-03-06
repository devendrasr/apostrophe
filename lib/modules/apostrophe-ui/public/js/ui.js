// Provides apos.ui, a singleton that provides user interface features
// used throughout Apostrophe on the browser side.
//
// ## Properties of interest
//
// ### apos.ui.shiftActive
//
// True whenever the shift key is down.

apos.define('apostrophe-ui', {

  afterConstruct: function(self) {
    $(function() {
      self.enablePrefix();
      self.enableShift();
      self.enableClickUrl();
      self.enableStyledFileButtons();
      self.enableActionable();
      self.enhanceDropdowns();
    });
  },

  construct: function(self, options) {

    self.options = options;

    // Sets apos.ui.shiftActive whenever the shift key is down.

    self.enableShift = function() {
      // Status of the shift key. Automatically updated.
      self.shiftActive = false;
      var $body = $('body');
      $body.keydown(function(e) {
        if (e.keyCode === 16) {
          self.shiftActive = true;
          apos.emit('shiftDown', e);
        }
      });

      $body.keyup(function(e) {
        if (e.keyCode === 16) {
          self.shiftActive = false;
          apos.emit('shiftUp', e);
        }
      });
    };

    // Utility that lets you add the data attribute 'data-apos-actionable' to any element and have
    // its `apos-active` class be toggled on click.
    //
    // Optionally you can give the attr a value which can be used to target another element's active
    // class to be toggled.

    self.enableActionable = function() {
      var $body = $('body');
      $body.on('click', '[data-apos-actionable]', function(event) {
        var $el = $(this);
        if ($el.attr('data-apos-actionable')) {
          $el.closest('[' + $el.attr('data-apos-actionable') + ']').toggleClass('apos-active');
        } else {
          $el.toggleClass('apos-active');
        }
      });
    };

    // Implement automatic width adjustment for `[data-apos-dropdown]` menus that have a
    // `[data-apos-dropdown-button-label]`.

    self.enhanceDropdowns = function() {
      $('body').on('click change', '[data-apos-dropdown]', function(event) {
        event.preventDefault();
        var $this = $(this);
        if ($this.find('[data-apos-dropdown-button-label]').length) {
          // only adjust width for button'y dropdowns
          // not global menu dropdowns
          var $label = $(this).find('[data-apos-dropdown-button-label]');
          if ($label.attr('data-apos-dropdown-button-label') === 'active') {
            $label.css('padding-right', $label.attr('data-apos-original-right-padding'));
            $label.attr('data-apos-dropdown-button-label', '');
          } else {
            $label.attr('data-apos-original-right-padding', $label.css('padding-right'));
            var val = parseInt($label.attr('data-apos-original-right-padding').substring(0, $label.attr('data-apos-original-right-padding').length - 2));
            var extra = ($(this).find('[data-apos-dropdown-items]')[0].getBoundingClientRect().width - $label[0].getBoundingClientRect().width + val );
            $label.css('padding-right', extra);
            $label.attr('data-apos-dropdown-button-label', 'active');
          }
        }
      })
    }

    // If the URL ends in: #click-whatever
    //
    // ... Then we locate an element with the attribute data-whatever,
    // and trigger a click event on it.
    //
    // This is useful for resuming an activity after requiring the
    // user to log in.

    self.enableClickUrl = function() {

      // Waiting long enough for both the click and the autoscroll to work is
      // tricky. We need to yield beyond DOMready so that other code installing click
      // handlers on DOMready has had time to do so. And we need to yield a little
      // extra time or the browser will crush our efforts to set scrollTop based on
      // its own idea of where we are on the page (at least in Chrome). ):

      setTimeout(function() {
        var hash = window.location.hash;
        var matches = hash.match(/^\#click\-(.*)$/);
        if (matches) {
          var $element = $('[data-' + matches[1] + ']');
          if ($element.length) {
            // Scroll back to the right neighborhood
            var offset = $element.offset();
            var scrollTop = offset.top - 100;
            $('html, body').scrollTop(scrollTop);
            // Now carry out the action
            $('[data-' + matches[1] + ']').trigger('click');
          }
        }
      }, 200);
    };

    // If Apostrophe has a global URL prefix, patch
    // jQuery's AJAX capabilities to prepend that prefix
    // to any non-absolute URL. This assists in avoiding the
    // need for application code to be specifically prefix-aware
    // and allows the prefix to be changed whenever needed.
    // See also [apostrophe-express](../apostrophe-express/index.html)

    self.enablePrefix = function(prefix) {

      if (prefix) {
        $.ajaxPrefilter(function(options, originalOptions, jqXHR) {
          if (options.url) {
            if (!options.url.match(/^[a-zA-Z]+:/))
            {
              options.url = prefix + options.url;
            }
          }
          return;
        });
      }
    };

    // Click the original file upload button if the styled
    // proxy for it is clicked. Allows indirect styling of
    // file buttons
    self.enableStyledFileButtons = function() {
      $('body').on('click', '[data-file-styled]', function() {
        $(this).parent().children('input').click();
      });
    };

    self.globalBusyCounter = 0;

    // If state is true, the interface changes to
    // indicate Apostrophe is busy loading a modal
    // dialog or other experience that preempts other
    // activities. If state is false, the interface
    // is unlocked. Calls may be nested and the
    // interface will not unlock until all
    // locks are released.
    //
    // See also apos.busy for interactions that
    // only need to indicate that one particular
    // element is busy.

    self.globalBusy = function(state) {
      if (state) {
        self.globalBusyCounter++;
        if (self.globalBusyCounter === 1) {
          // Newly busy
          self.globalLock();
        }
      } else {
        self.globalBusyCounter--;
        if (!self.globalBusyCounter) {
          // newly free
          self.globalUnlock();
        }
      }
    };

    // Do not call this method yourself. It is called
    // by self.globalBusy to display the global spinner.
    // Freel free to override this method to change the UI.

    self.globalLock = function() {
      var $freezer = $('<div class="apos-global-busy"></div>');
      $('body').append($freezer);
      $freezer.focus();  // focus adds a tick before triggering the active transition
      $freezer.addClass('active');
    };

    // Do not call this method yourself. It is called
    // by self.globalBusy to hide the global spinner.
    // Freel free to override this method to change the UI.

    self.globalUnlock = function() {
      var $freezer = $('.apos-global-busy');
      $freezer.removeClass('active');
      $('body').bind('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function() {
        $freezer.remove();
      });
    };

    // Simple progress display. Enables a progress display
    // inside the given element. If state is true, the
    // element with a [data-progress] attribute is shown,
    // otherwise the element with a [data-finished] attribute
    // is shown. Neither element is required. Supports
    // nested calls; does not revert to indicating complete
    // until the nesting level is 0.

    self.busy = function($el, state) {
      var busy = $el.data('busy') || 0;
      if (state) {
        busy++;
        $el.data('busy', busy);
        if (busy === 1) {
          $el.find('[data-progress]').show();
          $el.find('[data-finished]').hide();
        }
      } else {
        busy--;
        $el.data('busy', busy);
        if (!busy) {
          $el.find('[data-progress]').hide();
          $el.find('[data-finished]').show();
        }
      }
    };

    // Redirect correctly to the given location on the
    // Apostrophe site, even if the prefix option is in use
    // (you should provide a non-prefixed path). Note that
    // when prefixes are in use it is especially important
    // to use this method rather than simply setting
    // `window.location.href` yourself.

    self.redirect = function(slug) {
      var href = apos.prefix + slug;
      if (href === window.location.href) {
        window.location.reload();
      } else {
        window.location.href = href;
      }
    };

    // Enhance a plaintext date field with a pikaday date widget.

    self.enhanceDate = function($el, options) {
      if (!options) {
        options = {};
      }

      new Pikaday({
        field: $el[0],
        format: 'YYYY-MM-DD'
      });
    };

    // Converts apostrophe-schemas 24 hour time field strings
    // to local time. The format string depends on the
    // `userTimeFormat` option passed to this module, which
    // defaults to US 12 hour time. It must be understandable
    // by `launder.time`, however that method is very tolerant.

    self.formatTime = function(time, options) {
      if(!options) {
        options = {};
      }

      return moment(time, 'HH:mm:ss').format(self.options.userTimeFormat);
    };

    // Status of the shift key. Dynamically updated.
    self.shiftActive = false;

    // Add a callback when a link is clicked to trigger
    // a certain action.
    //
    // Example:
    //
    // self.link($el, 'edit', 'blogPost', fn)
    //
    // When a click occurs on anything inside $el with a
    // data-edit-blog-post attribute, invoke
    // "fn" with the jQuery element clicked and the value
    // of the attribute.
    //
    // self.link('apos-manage', 'blogPost', fn)
    //
    // When a click occurs anywhere on the page
    // on something with a data-manage-blog-post
    // attribute, invoke "fn" with the jquery element
    // clicked and the value of that attribute.
    //
    // Event propagation and the default behavior of
    // the click event are both automatically stopped.
    //
    // The word "object" refers to "the object of the sentence."
    // It is a STRING, not a javascript object.

    self.link = function(sel, verb, object, callback) {
      if (arguments.length === 3) {
        callback = object;
        object = verb;
        verb = sel;
        sel = 'body';
      }
      var attribute;
      if (object === null) {
        attribute = 'data-' + apos.utils.cssName(verb);
      } else {
        attribute = 'data-' + apos.utils.cssName(verb) + '-' + apos.utils.cssName(object);
      }
      var attributeSel = '[' + attribute + ']';
      $(sel).on('click', attributeSel, function() {
        callback($(this), $(this).attr(attribute));
        return false;
      });
    };

    apos.ui = self;
  }
});
