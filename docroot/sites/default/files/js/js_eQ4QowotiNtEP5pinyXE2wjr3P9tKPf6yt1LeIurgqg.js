(function ($) {

Drupal.behaviors.initColorbox = {
  attach: function (context, settings) {
    if (!$.isFunction($.colorbox)) {
      return;
    }
    $('a, area, input', context)
      .filter('.colorbox')
      .once('init-colorbox-processed')
      .colorbox(settings.colorbox);
  }
};

{
  $(document).bind('cbox_complete', function () {
    Drupal.attachBehaviors('#cboxLoadedContent');
  });
}

})(jQuery);
;
(function ($) {

Drupal.behaviors.initColorboxDefaultStyle = {
  attach: function (context, settings) {
    $(document).bind('cbox_complete', function () {
      // Only run if there is a title.
      if ($('#cboxTitle:empty', context).length == false) {
        setTimeout(function () { $('#cboxTitle', context).slideUp() }, 1500);
        $('#cboxLoadedContent img', context).bind('mouseover', function () {
          $('#cboxTitle', context).slideDown();
        });
        $('#cboxOverlay', context).bind('mouseover', function () {
          $('#cboxTitle', context).slideUp();
        });
      }
      else {
        $('#cboxTitle', context).hide();
      }
    });
  }
};

})(jQuery);
;
(function ($) {

Drupal.behaviors.initColorboxInline = {
  attach: function (context, settings) {
    if (!$.isFunction($.colorbox)) {
      return;
    }
    $.urlParam = function(name, url){
      if (name == 'fragment') {
        var results = new RegExp('(#[^&#]*)').exec(url);
      }
      else {
        var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(url);
      }
      if (!results) { return ''; }
      return results[1] || '';
    };
    $('a, area, input', context).filter('.colorbox-inline').once('init-colorbox-inline-processed').colorbox({
      transition:settings.colorbox.transition,
      speed:settings.colorbox.speed,
      opacity:settings.colorbox.opacity,
      slideshow:settings.colorbox.slideshow,
      slideshowAuto:settings.colorbox.slideshowAuto,
      slideshowSpeed:settings.colorbox.slideshowSpeed,
      slideshowStart:settings.colorbox.slideshowStart,
      slideshowStop:settings.colorbox.slideshowStop,
      current:settings.colorbox.current,
      previous:settings.colorbox.previous,
      next:settings.colorbox.next,
      close:settings.colorbox.close,
      overlayClose:settings.colorbox.overlayClose,
      maxWidth:settings.colorbox.maxWidth,
      maxHeight:settings.colorbox.maxHeight,
      innerWidth:function(){
        return $.urlParam('width', $(this).attr('href'));
      },
      innerHeight:function(){
        return $.urlParam('height', $(this).attr('href'));
      },
      title:function(){
        return decodeURIComponent($.urlParam('title', $(this).attr('href')));
      },
      iframe:function(){
        return $.urlParam('iframe', $(this).attr('href'));
      },
      inline:function(){
        return $.urlParam('inline', $(this).attr('href'));
      },
      href:function(){
        return $.urlParam('fragment', $(this).attr('href'));
      }
    });
  }
};

})(jQuery);
;
/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
 browser: true */

/*global jQuery: true debug: true Drupal: true window: true */


var ThemeBuilder = ThemeBuilder || {};

/**
 * The Bar class is the interface through which the themebuilder is added to
 * the page.  It exposes application level functionality, such as save,
 * publish, export.  It also provides APIs for the rest of the application to
 * interact with the themebuilder user interface.
 *
 * @class
 *
 * This class implements the singleton design pattern.
 */
ThemeBuilder.Bar = ThemeBuilder.initClass();

/**
 * This static method is the only way an instance of the Bar class should be
 * retrieved.  It ensures only one instance of the Bar class exists.
 *
 * @static
 *
 * @param {boolean} createIfNeeded
 *   (Optional) Indicates whether the instance should be created if it doesn't
 *   already exist.  Defaults to true.
 *
 * @return {ThemeBuilder.Bar}
 *   The instance of the ThemeBuilder.Bar class.  If no instance currently
 *   exists, one will be created as a result of calling this method.
 */
ThemeBuilder.Bar.getInstance = function (createIfNeeded) {
  createIfNeeded = createIfNeeded === undefined ? true : createIfNeeded;
  if (!ThemeBuilder.Bar._instance && createIfNeeded) {
    ThemeBuilder.Bar._instance = new ThemeBuilder.Bar();
  }
  return (ThemeBuilder.Bar._instance);
};

/**
 * The constructor of the Bar class.
 */
ThemeBuilder.Bar.prototype.initialize = function () {
  if (ThemeBuilder.Bar._instance) {
    throw "ThemeBuilder.Bar is a singleton that has already been instantiated.";
  }
  this.changed = false;
  this._dialogs = {};
  this.saving = false;
  this.links = {};
  this.showing = false;
  this.loader = null;
  if (ThemeBuilder.undoButtons) {
    ThemeBuilder.undoButtons.addStatusChangedListener(this);
  }
  this._attachEventHandlers();
  this._tabLoadRequests = [];
  this.listeners = [];
};

/**
 * Attaches event handlers to the buttons.  This must be called or the buttons
 * won't do anything.
 *
 * @private
 */
ThemeBuilder.Bar.prototype._attachEventHandlers = function () {
  var $ = jQuery;
  // Before attaching event handlers, make sure the elements exist.
  var selectors = ['#themebuilder-wrapper .export',
    '#themebuilder-wrapper #save',
    '#themebuilder-wrapper #save-as',
    '#themebuilder-wrapper #publish',
    '#themebuilder-mini-button',
    '#themebuilder-exit-button'];
  for (var index = 0; index < selectors.length; index++) {
    var selector = selectors[index];
    if (selector.indexOf('#themebuilder') === 0) {
      if ($(selector).length === 0) {
        // The element does not exist on the page yet.  Wait for the element
        // to appear before adding event listeners.
        setTimeout(ThemeBuilder.bindIgnoreCallerArgs(this, this._attachEventHandlers), 150);
        return;
      }
    }
  }
  // The elements exist.  Attach the event handlers.
  $('#themebuilder-wrapper').click(ThemeBuilder.bind(this, this.quarantineEvents));
  $('#themebuilder-wrapper .export').click(ThemeBuilder.bind(this, this.exportTheme));
  $('#themebuilder-wrapper #save').click(ThemeBuilder.bind(this, this.saveHandler));
  $('#themebuilder-wrapper #save-as').click(ThemeBuilder.bind(this, this.saveas));
  $('#themebuilder-wrapper #publish').click(ThemeBuilder.bind(this, this.publishHandler));
  $('#themebuilder-mini-button').click(ThemeBuilder.bind(this, this.toggleMinimize));
  $('#themebuilder-exit-button').click(ThemeBuilder.bindIgnoreCallerArgs(this, this.exit, true));
  $('#themebuilder-main').bind('save', ThemeBuilder.bind(this, this._saveCallback));
  $('#themebuilder-main').bind('modified', ThemeBuilder.bind(this, this.indicateThemeModified));
};

/**
 * Keypress event handler, to correctly handle the Enter key in save dialogs.
 *
 * @private
 *
 * @param {event} event
 *   The keypress event.
 * @param {string} dialogName
 *   The name of the save dialog.
 */
ThemeBuilder.Bar.prototype._handleKeyPress = function (event, dialogName) {
  if ((event.which && event.which === 13) || (event.keyCode && event.keyCode === 13)) {
    // This only works because the OK button appears first in the markup.
    this.getDialog(dialogName).siblings('.ui-dialog-buttonpane').find('button:first').click();
    return ThemeBuilder.util.stopEvent(event);
  }
};

/**
 * Displays an indicator over the current page to indicate the themebuilder is
 * busy.
 */
ThemeBuilder.Bar.prototype.showWaitIndicator = function () {
  var $ = jQuery;
  // Show the throbber to indicate it's loading.
  $('<div class="themebuilder-loader"></div>').
    appendTo($('body'));
};

/**
 * Removes the busy indicator.
 */
ThemeBuilder.Bar.prototype.hideWaitIndicator = function () {
  var $ = jQuery;
  $('.themebuilder-loader').remove();
};

/**
 * Called when the user clicks the button to enter the themebuilder.  This
 * method causes the themebuilder to open.
 */
ThemeBuilder.Bar.prototype.openThemebuilder = function () {
  if (this.showing && !this.forceReload) {
    return;
  }
  // Don't open Themebuilder if the overlay is open.
  if (Drupal.overlay && (Drupal.overlay.isOpen || Drupal.overlay.isOpening)) {
    Drupal.overlay.close();
  }
  var ic = new ThemeBuilder.StartInteraction();
  ic.start();
};
/**
 * Reloads the page.
 */
ThemeBuilder.Bar.prototype.reloadPage = function (data) {
  var $ = jQuery;

  // If there was an error, then stop.
  if (data && data.error) {
    alert(data.error);
    this.hideWaitIndicator();
    return;
  }

  // Reload, which is required even if there are no changes to the
  // theme to make sure the gears work after the themebuilder is
  // closed.
  parent.location.reload(true);
};

/**
 * Displays the themebuilder user interface and performs any necessary
 * initialization.
 */
ThemeBuilder.Bar.prototype.show = function () {
  if (this.showing) {
    return;
  }
  var $ = jQuery;
  this.showing = true;
  this.trackWindowSize();

  // Disable the undo and redo buttons until the themebuilder is fully started.
  var statusKey;
  if (ThemeBuilder.undoButtons) {
    statusKey = ThemeBuilder.undoButtons.disable();
  }

  $('#themebuilder-wrapper').show();
  $('body').addClass('themebuilder');
  $('#themebuilder-main').tabs(
    {select: ThemeBuilder.bind(this, this.tabSelected)}
  );
  this._initializeCurrentTab();

  if (!Drupal.settings.themebuilderSaved) {
    $('#themebuilder-save #save').addClass('disabled');
  }
  var state = this.getSavedState();
  $('#themebuilder-main').tabs('select', '#' + state.tabId);
  this.getTabObject(state.tabId).show();

  this._createVeil();

  // Allow the undo and redo buttons to be used now that the themebuilder is
  // ready.
  if (statusKey) {
    ThemeBuilder.undoButtons.clear(statusKey);
  }
  statusKey = undefined;

  $('#themebuilder-theme-name .theme-name').truncate({addtitle: true});
  this.showInitialAlert();
};

/**
 * Called when the application init data is available.
 *
 * @param {Object} data
 *   The Application init data.
 */
ThemeBuilder.Bar.initializeUserInterface = function (data) {
  var $ = jQuery;
  ThemeBuilder.Bar.showInitialMessage(data);
  var bar = ThemeBuilder.Bar.getInstance();
  bar.setChanged(Drupal.settings.themebuilderIsModified);
  bar.buildThemeUpdateLink();
  if (!bar.userMayPublish()) {
    bar.hidePublishButton();
  }
};

/**
 * Hides the Publish button as soon as it is available in the DOM.
 */
ThemeBuilder.Bar.prototype.hidePublishButton = function () {
  var $button = jQuery('#themebuilder-wrapper #publish');
  if ($button.length === 0) {
    setTimeout(ThemeBuilder.bindIgnoreCallerArgs(this, this.hidePublishButton), 150);
    return;
  }

  // The publish button now exists in the DOM, so it can be hidden.
  $button.hide();
};

/**
 * Sets up the update theme indicator according to whether an update is
 * available or not.
 */
ThemeBuilder.Bar.prototype.buildThemeUpdateLink = function () {
  var data = ThemeBuilder.getApplicationInstance().getData(),
  $ = jQuery,
  alertImage = $();
  if (Drupal.settings.themebuilderAlertImage) {
    alertImage = $('<img>', {
      src: Drupal.settings.themebuilderAlertImage
    })
    .addClass('tb-alert-icon');
  }
  // Build the theme update link and append it to the #themebuilder-wrapper.
  // Someday we'll have templates for these things.
  $('<div>', {
    id: 'themebuilder-theme-update',
    // The empty object is necessary to make the div element render.
    html: $('<div>', {})
    .append(alertImage)
    .append($('<span>', {
        text: Drupal.t('New theme update')
      })
      .addClass('tb-label')
    )
    .append($('<span>', {
        text: Drupal.t('Preview')
      })
      .addClass('tb-link')
      .click(ThemeBuilder.bind(this, this.updateTheme))
    )
    .addClass('tb-update-available-wrapper')
  })
  .addClass((data.theme_update_available) ? '' : 'tb-disabled')
  .prependTo('#themebuilder-wrapper');
};

/**
 * Causes window resizes to be detected, and resizes the themebuilder panel
 * accordingly.
 */
ThemeBuilder.Bar.prototype.trackWindowSize = function () {
  var $ = jQuery;
  $(window).resize(ThemeBuilder.bind(this, this.windowSizeChanged));
  this.windowSizeChanged();
};

/**
 * When the window size changes, reset the max-width property of the
 * themebuilder.  Certain properties applied to the body tag will have an
 * effect on the layout of the themebuilder.  These include padding and
 * margin.  Because they change the size of the actual window, this type of
 * CSS "leakage" could not be fixed by the css insulator or iframe alone.
 *
 * @param {Event} event
 *   The window resize event.
 */
ThemeBuilder.Bar.prototype.windowSizeChanged = function (event) {
  var $ = jQuery;
  var win = window;
  if (event && event.currentTarget) {
    win = event.currentTarget;
  }
  $('#themebuilder-wrapper').css('max-width', $(win).width());
};

/**
 * Returns tab info for the specified tab.  The tab can be specified by id
 * (ex: themebuilder-layout) or name (ex: layout).  If the tabName is not
 * provided, the info for the currently selected theme will be used.
 *
 * @param tabName
 *   The name of the tab to provide info for.  If not provided, the current
 *   tab will be used.
 *
 * @return {Array}
 *   An array of information about the specified tab.  This includes the name,
 *   title, weight, link, and id.
 */
ThemeBuilder.Bar.prototype.getTabInfo = function (tabName) {
  var tabId, name, state, tabInfo;
  if (!tabName) {
    state = this.getSavedState();
    tabId = state.tabId;
    name = tabId.replace(/^themebuilder-/, '');
  }
  else {
    name = tabName.replace(/^[#]?themebuilder-/, '');
    tabId = 'themebuilder-' + name;
  }
  // Note (jbeach): This might not be the right place to do the following
  // fallback to a default tab. I'm not wild about calling saveState in a get.
  //
  // The saved state might differ from the available toolbar items if the user's
  // access privileges to this tab have been revoked since they last had the
  // ThemeBuilder open. If the tab is in the toolbarItems, we can proceed.
  if (name in Drupal.settings.toolbarItems) {
    tabInfo = ThemeBuilder.clone(Drupal.settings.toolbarItems[name]);
    tabInfo.id = tabId;
  }
  // Otherwise, get the first tab and return that as the current tab.
  else {
    tabInfo = ThemeBuilder.clone(this.getDefaultState());
    tabInfo.id = 'themebuilder-' + tabInfo.name;
    this.saveState(tabInfo.id);
  }
  return tabInfo;
};

/**
 * Returns the object that manages the tab with the specified id.
 *
 * The tab manager has the following methods:
 *   show - called when the tab is selected by the user.
 *   hide - called when the user traverses away from the tab.
 *
 * @param {String} id
 *   The id associated with the tab.
 *
 * @return {Object}
 *   The object that manages the tab associated with the id.  An exception is
 *   thrown if the id is unknown.
 */
ThemeBuilder.Bar.prototype.getTabObject = function (id) {
  switch (id) {
  case 'themebuilder-brand':
    return ThemeBuilder.brandEditor;
  case 'themebuilder-advanced':
    return ThemeBuilder.AdvancedTab.getInstance();
  case 'themebuilder-layout':
    return ThemeBuilder.LayoutEditor.getInstance();
  case 'themebuilder-style':
    return ThemeBuilder.styleEditor;
  case 'themebuilder-themes':
    return ThemeBuilder.themeSelector;
  default:
    throw Drupal.t('ThemeBuilder.Bar.getTabObject: unknown tab %id', {'%id': id});
  }
};

/**
 * Called when a major tab in the themebuilder is selected.  This method is
 * responsible for sending messages to the currently open tab and the tab
 * being opened so the tabs can do necessary cleanup before the UI is updated.
 *
 * @param {Event} event
 *   The tabselect event.
 * @param {Object} ui
 *   The jQuery object associated with changing tabs.  This object holds
 *   information about the tab being selected.
 *
 * @return {boolean}
 *   True if the tab selection should be honored; false if the tab selection
 *   should be aborted.
 */
ThemeBuilder.Bar.prototype.tabSelected = function (event, ui) {
  var currentTabInfo = this.getTabInfo();
  var newTabInfo = this.getTabInfo(ui.tab.hash);

  if (currentTabInfo.id !== newTabInfo.id) {
    // Only hide the current tab if we selected a different tab.
    var current = this.getTabObject(currentTabInfo.id);
    if (current.hide() === false) {
      return false;
    }
  }
  this._initializeTab(newTabInfo.name);
  var panel = this.getTabObject(newTabInfo.id);
  if (panel.show() === false) {
    return false;
  }
  for (var i = 0; i < this.listeners.length; i++) {
    if (this.listeners[i].selectorChanged) {
      this.listeners[i].handleTabSwitch(panel);
    }
  }

  return true;
};

/**
 * Saves the current state of the UI.
 *
 * The state include the current tab id, and can contain other
 * information as needed.  This method determines whether it is
 * necessary to save the state to avoid sending unnecessary requests
 * to the server.
 *
 * @param {String} tabId
 *   The element id of the currently selected tab.
 * @param {Object} otherInfo
 *   Any other information that should be saved with the state.
 * @param {Function} successCallback
 *   The callback that should be invoked upon success.
 * @param {Function} failureCallback
 *   The callback that should be invoken upon failure.
 */
ThemeBuilder.Bar.prototype.saveState = function (tabId, otherInfo, successCallback, failureCallback) {
  var originalState = this.getSavedState();
  // Avoid superfluous requests to the server.
  if (originalState && originalState.tabId === tabId &&
      !otherInfo &&
      !successCallback) {
    return;
  }

  // Send the request.
  var state = {
    tabId: tabId,
    info: otherInfo
  };
  ThemeBuilder.postBack('themebuilder-save-state', {state: JSON.stringify(state)}, successCallback, failureCallback);
  Drupal.settings.toolbarState = state;
};

/**
 * Returns the currently saved state.
 *
 * The saved state can be in one of two forms - the older form is a
 * simple string containing the tab id, the newer form is an object
 * that contains the tab id as a field.  This method reads both and
 * returns the newer object form.  This will ease the update
 * transition.
 *
 * @return {Object}
 *   An object containing the saved state, including a field name
 *   'tabId' that contains the id of the active tab.
 */
ThemeBuilder.Bar.prototype.getSavedState = function () {
  var state;
  state = Drupal.settings.toolbarState;
  if (!state) {
    throw new Error('Drupal.settings.toolbarState is not set.');
  }
  if (!state.tabId) {
    try {
      state = jQuery.parseJSON(Drupal.settings.toolbarState);
    } catch (e) {
      if (typeof(state) === 'string') {
	// The state is a string, not an object.  Originally the state
	// was a string that only contained the id of the tab element.
	// Create a new structure with that info.
        state = {
          tabId: state,
          info: {}
        };
      }
    }
    // Only parse this info once.
    Drupal.settings.toolbarState = state;
  }

  if (state.tabId[0] === '#') {
    state.tabId = state.tabId.slice(1);
    Drupal.settings.toolbarState = state;
  }
  return state;
};

/**
 *
 */
ThemeBuilder.Bar.prototype.getDefaultState = function () {
  var state, items, tab;
  items = Drupal.settings.toolbarItems;
  if (items && items.length === 0) {
    throw new Error('Drupal.settings.toolbarItems does not contain any items.');
  }
  else {
    // Get the first tab in the list. The tabs are keyed by tab name.
    tabInfo: for (tab in items) {
      if (items.hasOwnProperty(tab)) {
        state = items[tab];
        break tabInfo;
      }
    }
  }
  return state;
};

/**
 * Initializes the tab associated with the specified name.  This method loads
 * all of the javascript assocaited with the tab.
 *
 * @private
 *
 * @param {String} name
 *   The name of the tab to initialize.  This will be used to construct the
 *   element id associated with the tab.
 */
ThemeBuilder.Bar.prototype._initializeTab = function (name) {
  var obj = this.getTabInfo(name);
  if (this._tabLoadRequests[obj.id] === true) {
    // The tab contents have already been requested.
    this.saveState(obj.id);
    return;
  }
  var $ = jQuery;
  this.links[obj.name] = obj.link;
  var panel = $('#' + obj.id);
  if (obj.link) {
    ThemeBuilder.load(panel, obj.link, {}, ThemeBuilder.bind(this, this.tabResourcesLoaded, obj, name, panel), '', false);
  }
  // Allow modules to define tabs with no server-side markup.
  else {
    this.tabResourcesLoaded('', 'success', obj, name, panel);
  }

  // Remember that we requested the tab contents.
  this._tabLoadRequests[obj.id] = true;
};

/**
 * Called when the tab resources are loaded.  This method is responsible for
 * initializing the tabs as soon as the tab is loaded.
 *
 * @param {String} markup
 *   The markup resulting from loading the tab.
 * @param {String} status
 *   Indicates whether the load succeeded.  Should be "success".
 * @param {Object} obj
 *   Provides information about the tab.
 * @param {String} name
 *   The name of the tab.
 * @param {jQuery Object} panel
 *   The object representing the panel associated with the tab.
 */
ThemeBuilder.Bar.prototype.tabResourcesLoaded = function (markup, status, obj, name, panel) {
  if (status !== 'success') {
    // The load failed.  Allow the load to occur again.
    delete this._tabLoadRequests[obj.id];
  }
  else {
    // The tab load succeeded.  Remember which tab we are on.
    this.saveState(obj.id);
  }
  var $ = jQuery;
  var tabObject = this.getTabObject(obj.id);
  if (tabObject && tabObject.init) {
    tabObject.init();
  }
  if (tabObject && tabObject.loaded) {
    tabObject.loaded();
  }
  if (!panel.is('.ui-tabs-hide')) {
    if (this.loader) {
      this.loader.hide();
    }
    this.hideWaitIndicator();
    panel.show();
  }
};

/**
 * Causes the currently selected tab to be initialized.  If the tabs are being
 * lazy loaded, this is the only tab initialization that needs to be done.
 *
 * @private
 */
ThemeBuilder.Bar.prototype._initializeCurrentTab = function () {
  var currentTabInfo = this.getTabInfo();
  this._initializeTab(currentTabInfo.name);
};


ThemeBuilder.Bar.prototype.addBarListener = function (listener) {
  this.listeners.push(listener);
};

/**
 * Sets the change status of the theme being edited.  This causes the user
 * interface to reflect the current state of modification.
 *
 * @param {boolean} isChanged
 *   True if the theme has been modified since the last save; false otherwise.
 */
ThemeBuilder.Bar.prototype.setChanged = function (isChanged) {
  var $ = jQuery;
  if (isChanged === null) {
    isChanged = true;
  }
  this.changed = isChanged;

  if (this.changed) {
    // Enable the Save button, if the user has permission to use it.
    if (this.userMaySave()) {
      $('#themebuilder-save #save').removeClass('disabled');
    }
    $('#themebuilder-main').trigger('modified');
    this.indicateThemeModified();
  }
  else {
    $('#themebuilder-save #save').addClass('disabled');
    this.clearModifiedFlag();
  }
};

/**
 * Determines whether the user has permission to publish themes.
 */
ThemeBuilder.Bar.prototype.userMayPublish = function () {
  var data = ThemeBuilder.getApplicationInstance().getData();
  if (data.user_permissions && data.user_permissions.publish_theme) {
    return true;
  }
};


/**
 * Determines whether the user has permission to save a given theme.
 *
 * @param {String} themeName
 *   The name of the theme to be saved. Defaults to the current theme.
 */
ThemeBuilder.Bar.prototype.userMaySave = function (themeName) {
  var theme = (themeName ? ThemeBuilder.Theme.getTheme(themeName) : theme = ThemeBuilder.Theme.getSelectedTheme());

  // Determine whether the active theme is the published theme.
  if (theme.isPublished()) {
    // If so, saving would affect the published theme. Make sure the user has
    // publish theme permissions.
    return this.userMayPublish();
  }
  // If the theme being saved is not the published theme, any user may save it.
  return true;
};

/**
 * Called when a request is sent that changes status of the undo and redo
 * buttons.  This method is responsible for disabling the buttons accordingly
 * to prevent the user from causing the client and server to get out of sync.
 *
 * @param {boolean} status
 *   If true, the status is going from an empty undo/redo stack to a non-empty
 *   stack.  false indicates the opposite.
 *
 */
ThemeBuilder.Bar.prototype.undoStatusChanged = function (status) {
  if (status) {
    this.enableButtons();
  }
  else {
    this.disableButtons();
  }
  this.stackChanged();
};

/**
 * Called when the undo stack state has changed.  This function is responsible
 * for enabling and disabling the undo and redo buttons.
 *
 * @param stack object
 *   The stack that changed state.
 */
ThemeBuilder.Bar.prototype.stackChanged = function (stack) {
  if (!ThemeBuilder.undoButtons) {
    return;
  }
  var undoStatus = ThemeBuilder.undoButtons.getStatus();
  var $ = jQuery;
  if (!stack || stack === ThemeBuilder.undoStack) {
    var undoSize = ThemeBuilder.undoStack.size();
    if (undoSize <= 0 || undoStatus !== true) {
      $('.themebuilder-undo-button').addClass('undo-disabled')
        .unbind('click');
    }
    else {
      $('.themebuilder-undo-button.undo-disabled').removeClass('undo-disabled')
      .bind('click', ThemeBuilder.undo);
    }
  }
  if (!stack || stack === ThemeBuilder.redoStack) {
    var redoSize = ThemeBuilder.redoStack.size();
    if (redoSize <= 0 || !undoStatus) {
      $('.themebuilder-redo-button').addClass('undo-disabled')
      .unbind('click');
    }
    else {
      $('.themebuilder-redo-button.undo-disabled').removeClass('undo-disabled')
      .bind('click', ThemeBuilder.redo);
    }
  }
};

/**
 * Handler for the Save button.
 */
ThemeBuilder.Bar.prototype.saveHandler = function (event) {
  event.preventDefault();
  var $link = jQuery(event.currentTarget);
  if ($link.hasClass('disabled')) {
    // For users without save permissions, display a dialog letting them know
    // why they're not allowed to save.
    if (!this.userMaySave()) {
      var saveas = confirm(Drupal.t('Saving this theme would change the published (live) theme. Do you wish to save your work as a new theme?'));
      if (saveas) {
        this.saveas();
      }
    }
    return;
  }
  this.save();
};

/**
 * Causes the theme currently being edited to be saved.  This should only be
 * called if there is a theme system name to which the theme should be saved.
 * Otherwise, the user should provide a theme name.  That can be done with the
 * saveas method.
 */
ThemeBuilder.Bar.prototype.save = function () {
  if (!Drupal.settings.themebuilderSaved) {
    this.saveas();
    return;
  }

  var selectedTheme = ThemeBuilder.Theme.getSelectedTheme();
  if (selectedTheme.isPublished()) {
    var saveAnyway = confirm(Drupal.t('Clicking OK will change your published (live) theme. Do you want to continue?'));
    if (saveAnyway !== true) {
      this.saveas();
      return;
    }
  }

  this.disableThemebuilder();
  ThemeBuilder.postBack('themebuilder-save', {},
    ThemeBuilder.bind(this, this._themeSaved),
    ThemeBuilder.bind(this, this._themeSaveFailed));
};

/**
 * Called when the theme has been saved.
 *
 * @private
 *
 * @param {Object} data
 *   The information returned from the server as a result of the theme being
 *   saved.
 */
ThemeBuilder.Bar.prototype._themeSaved = function (data) {
  var $ = jQuery;
  try {
    $('#themebuilder-main').trigger('save', data);

    // A theme created as part of the 'save as' process should take over the
    // applied state.
    var app = ThemeBuilder.getApplicationInstance();
    app.updateData({
      bar_saved_theme: ThemeBuilder.Theme.getTheme(data.system_name)
    });
  }
  catch (e) {
  }
  this.enableThemebuilder();
};

/**
 * Called when the the save fails.  This provides an opportunity to recover
 * and allow the user to continue without losing their work.
 *
 * @param {Object} data
 *   The data returned from the failed request.
 */
ThemeBuilder.Bar.prototype._themeSaveFailed = function (data) {
  ThemeBuilder.handleError(data, data.type, 'recoverableError');
  this.enableThemebuilder();
};

/**
 * Causes a dialog box to appear that asks the user for a theme name, and then
 * saves the theme.
 */
ThemeBuilder.Bar.prototype.saveas = function (event) {
  if (event) {
    event.preventDefault();
  }

  this.processSaveDialog('themebuilderSaveDialog', false, 'themebuilder-save', ThemeBuilder.bind(this, this._saveDialogCallback, false));
};

/**
 * Called when the user clicks the export link, and causes the theme to be
 * exported.
 */
ThemeBuilder.Bar.prototype.exportTheme = function () {
  this.processSaveDialog('themebuilderExportDialog', false, 'themebuilder-export', ThemeBuilder.bind(this, this._themeExported));
};

/**
 * Called when the user clicks the "Update available" link.
 */
ThemeBuilder.Bar.prototype.updateTheme = function () {
  if (confirm(Drupal.t("There is an update available for your site's theme which contains new features or bug fixes.\nClick OK to preview this update."))) {
    this.showWaitIndicator();
    this.disableThemebuilder();
    // Force the screen to refresh after the update.
    this.forceReload = true;
    ThemeBuilder.postBack('themebuilder-update-theme', {},
      ThemeBuilder.bind(this, this.reloadPage));
  }
};

/**
 * This method is called after the theme is exported.
 *
 * @private
 *
 * @param {Object} data
 *   The information returned from the server as a result of the theme being
 *   exported.
 */
ThemeBuilder.Bar.prototype._themeExported = function (data) {
  this.setStatus(Drupal.t('%theme_name was successfully exported.', {'%theme_name': data.name}));
  window.location = data.export_download_url;
  this.enableThemebuilder();
};

/**
 * Handler for the publish button.
 */
ThemeBuilder.Bar.prototype.publishHandler = function (event) {
  if (event) {
    event.preventDefault();
  }
  var $link = jQuery(event.currentTarget);
  if ($link.hasClass('disabled')) {
    return;
  }
  this.publish();
};

/**
 * Causes the theme to be published.  If the there is no associated system
 * name for the theme to save to, a dialog will appear asking the user for a
 * theme name.
 */
ThemeBuilder.Bar.prototype.publish = function () {
  if (!Drupal.settings.themebuilderSaved) {
    // Only need to save before publishing if the theme has never been saved
    // before and doesn't have a name.  Publishing the theme causes the draft
    // theme to be copied (same as the save functionality).
    this.processSaveDialog('themebuilderPublishDialog', true, 'themebuilder-save', ThemeBuilder.bind(this, this._saveDialogCallback));
  }
  else {
    // Publish the theme.
    this.disableThemebuilder();

    // Publish is really expensive because it rebuilds the theme
    // cache.  Avoid doing that if we are really just saving to the
    // published theme.  Save is way more efficient.
    var appData = ThemeBuilder.getApplicationInstance().getData();
    var publish = appData.selectedTheme !== appData.published_theme;
    ThemeBuilder.postBack('themebuilder-save', {publish: publish},
      ThemeBuilder.bind(this, this._publishCallback));
  }
};

/**
 * This callback is invoked from the save dialog and used to cause the actual
 * save to occur.
 *
 * @private
 *
 * @param {Object} data
 *   The information entered into the save dialog by the user.
 * @param {String} status
 *   The status indicator.  "success" indicates the call was successful.
 * @param {boolean} publish
 *   If true, the saved theme will be published.
 */
ThemeBuilder.Bar.prototype._saveDialogCallback = function (data, status, publish) {
  // If the server informed us that this theme name already exists, prompt
  // for overwrite.
  if (data.themeExists) {
    var overwrite = confirm("A theme with that name already exists. Would you like to overwrite it?");
    if (overwrite) {
      var saveArguments = {
        'name': data.themeName,
        'overwrite': true
      };
      if (true === data.publish) {
        saveArguments.publish = data.publish;
      }
      this.disableThemebuilder();
      ThemeBuilder.postBack('themebuilder-save', saveArguments,
        ThemeBuilder.bind(this, this._saveDialogCallback, publish), ThemeBuilder.bind(this, this._themeSaveFailed));
    }
    else {
      this.enableThemebuilder();
    }
  }
  // If the server disallowed the save (because an unprivileged user is trying
  // to overwrite the live theme), tell the user why their save failed.
  else if (data.overwriteDisallowed) {
    window.alert(Drupal.t('"@name" is the live theme and cannot be overwritten.', {"@name": data.themeName}));
    this.enableThemebuilder();
  }
  else {
    if (true === publish) {
      this._publishCallback(data);
    }
    else {
      this._themeSaved(data);
    }
  }
};

/**
 * This callback is invoked after the theme has been published.  This method
 * causes the UI to reflect the current theme name and updates application
 * data to match the new published theme.
 *
 * @private
 *
 * @param {Object} data
 *   The data that is passed from the server upon publishing the theme.
 */
ThemeBuilder.Bar.prototype._publishCallback = function (data) {
  this.setChanged(false);
  this.setStatus(Drupal.t('%theme_name is now live.', {'%theme_name': data.name}));
  this.setInfo(data.name, data.time);

  var app = ThemeBuilder.getApplicationInstance();

  // This fetch of the app data and setting the published and selected themes
  // to the system_name is necessary for setVisibilityText to work. It's voodoo
  // in my [jbeach] opinion, but it works right now, so we'll go with it.
  var appData = app.getData();
  appData.published_theme = appData.selectedTheme = data.system_name;

  // Trigger an app data update
  app.updateData({
    bar_published_theme: ThemeBuilder.Theme.getTheme(data.system_name)
  });

  // Update the cached theme data to reflect the change.
  this.updateThemeData(data);

  // We updated the active theme, so reset the message
  ThemeBuilder.Bar.getInstance().setVisibilityText();
  this.enableThemebuilder();
};

/**
 * Updates the cached theme data.  This should be called any time the
 * theme has changed (save, publish).
 *
 * @param {Object} data
 *   The data associated with a save or publish response.
 */
ThemeBuilder.Bar.prototype.updateThemeData = function (data) {
  var theme = ThemeBuilder.Theme.getTheme(data.system_name);
  if (theme) {
    theme.update(data);
  }
  else {
    theme = new ThemeBuilder.Theme(data);
    theme.addTheme();
  }
  var appData = ThemeBuilder.getApplicationInstance().getData();
  appData.selectedTheme = theme.getSystemName();
};

/**
 * Called after the theme is saved.
 *
 * @private
 *
 * @param {DomElement} element
 *   The element from which the callback was triggered.
 * @param {Object} data
 *   The data associated with the save call.
 */
ThemeBuilder.Bar.prototype._saveCallback = function (element, data) {
  // Disable the "save" button until the theme is modified again.
  Drupal.settings.themebuilderSaved = true;
  var $ = jQuery;
  $('#themebuilder-save #save').addClass('disabled');

  // Update the theme name data
  this.setChanged(false);
  this.setInfo(data.name, data.time);

  if (data.name) {
    Drupal.settings.themeLabel = data.name;
  }
  if (true === data.publish) {
    this.setStatus(Drupal.t('%theme_name was successfully published.', {'%theme_name': data.name}));
  }
  else if (true === data.save_as) {
    // The user clicked "Save as"
    this.setStatus(Drupal.t('%theme_name was successfully copied and saved.', {'%theme_name': data.name}));
  } else {
    // The user clicked "Save"
    this.setStatus(Drupal.t('%theme_name was successfully saved.', {'%theme_name': data.name}));
  }

  // Fix the cached theme data.
  this.updateThemeData(data);
  this.enableThemebuilder();
};

/**
 * Displays and processes a standard ThemeBuilder save dialog.
 *
 * @param {string} dialogName
 *   The name for the dialog (e.g. themebuilderSaveDialog). It should have a
 *   corresponding item in the Drupal.settings object containing the HTML
 *   for the main part of the dialog form (e.g.
 *   Drupal.settings.themebuilderSaveDialog). The HTML needs to contain the
 *   'name' field (i.e. the id for the field must be "edit-name"). Buttons for
 *   "OK" and "Cancel" will be automatically added to the form.
 * @param {boolean} publish
 *   If true, the theme will be published after the save.
 * @param postbackPath
 *   The path to post results to when the "OK" button is clicked; this will be
 *   passed to ThemeBuilder.postBack as the path parameter.
 * @param callback
 *   The callback function to which the results of the POST request will be
 *   passed after the "OK" button is clicked. This will be passed to
 *   ThemeBuilder.postBack as the success_callback parameter.
 */
ThemeBuilder.Bar.prototype.processSaveDialog = function (dialogName, publish, postbackPath, callback) {
  var $ = jQuery;
  var $dialog = this.getDialog(dialogName);
  if ($dialog) {
    $dialog.dialog('open');
  }
  else {
    var dialogForm = Drupal.settings[dialogName];
    $dialog = $(dialogForm).appendTo('body').dialog({
      bgiframe: true,
      autoOpen: true,
      dialogClass: 'themebuilder-dialog',
      modal: true,
      overlay: {
        backgroundColor: '#000',
        opacity: 0.5
      },
      position: 'center',
      width: 335,
      buttons: {
        'OK': ThemeBuilder.bind(this, this._saveDialogOkButtonPressed, dialogName, postbackPath, publish, callback),
        'Cancel': ThemeBuilder.bind(this, this._saveDialogCancelButtonPressed, dialogName)
      },
      close: ThemeBuilder.bindIgnoreCallerArgs(this, this._saveDialogClose, dialogName),
      open: ThemeBuilder.bind(this, this._saveDialogOpen)
    });
    $dialog.find('form').keypress(ThemeBuilder.bind(this, this._handleKeyPress, dialogName));
    // Prevent users from naming a theme with a string longer than 25 characters
    // This addresses https://backlog.acquia.com/browse/AN-26333
    this._enableLiveInputLimit('#themebuilder-bar-save-form #edit-name');
    var input = '#themebuilder-bar-save-form #edit-name';
    this._limitInput(input);
    $(input).bind('paste', ThemeBuilder.bind(this, this._limitInput));

    this.setDialog(dialogName, $dialog);
  }
  // Put the cursor on the form
  $dialog.find('input:first').focus();
};

/**
 * Retrieve a reference to a jQuery UI Dialog.
 *
 * @param {string} dialogName
 *   The name of the dialog.
 *
 * @return {jQuery}
 *   The jQuery object containing the dialog.
 */
ThemeBuilder.Bar.prototype.getDialog = function (dialogName) {
  return this._dialogs[dialogName] || false;
};

/**
 * Save a reference to a jQuery UI Dialog.
 *
 * @param {string} dialogName
 *   The name of the dialog.
 * @param {jQuery} $dialog
 *   The jQuery object containing the dialog.
 *
 * @return {jQuery}
 *   The jQuery object containing the dialog.
 */
ThemeBuilder.Bar.prototype.setDialog = function (dialogName, $dialog) {
  this._dialogs[dialogName] = $dialog;
  return this._dialogs[dialogName];
};

/**
 * Called when the user presses the Ok button in the save dialog.  This method
 * causes the associated post to occur and closes the dialog.
 *
 * @private
 *
 * @param {DomEvent} event
 *   The event associated with the button press.
 * @param postbackPath
 *   The path to post results to when the "OK" button is clicked; this will be
 *   passed to ThemeBuilder.postBack as the path parameter.
 * @param {boolean} publish
 *   If true, the theme will be published after the save.
 * @param callback
 *   The callback function to which the results of the POST request will be
 *   passed after the "OK" button is clicked. This will be passed to
 *   ThemeBuilder.postBack as the success_callback parameter.
 */
ThemeBuilder.Bar.prototype._saveDialogOkButtonPressed = function (event, dialogName, postbackPath, publish, callback) {
  var $ = jQuery;
  var $dialog = this.getDialog(dialogName);
  var $nameField = $('.name:first', $dialog);
  // Validate the theme name field.
  if (!$nameField.val()) {
    if (!$nameField.hasClass("ui-state-error")) {
      $nameField.addClass("ui-state-error");
      $nameField.before("<div class='error-message'>" + Drupal.t("Please enter a theme name.") + "</div>");
    }
  }
  else {
    this.disableThemebuilder();
    var saveArguments = {'name': $nameField.val()};
    if (true === publish) {
      saveArguments.publish = publish;
    }
    ThemeBuilder.postBack(postbackPath, saveArguments, callback, ThemeBuilder.bind(this, this._themeSaveFailed));
    $dialog.dialog('close');
  }
};

/**
 * Called when the user presses the Cancel button in the save dialog.  This
 * method causes the dialog to be closed.
 *
 * @private
 */
ThemeBuilder.Bar.prototype._saveDialogCancelButtonPressed = function (event, dialogName) {
  var $ = jQuery;
  this.getDialog(dialogName).dialog('close');
};

/**
 * Called when the save dialog is opened.
 *
 * @private
 */
ThemeBuilder.Bar.prototype._saveDialogOpen = function () {
  this.maximize();
};

/**
 * Called when the save dialog is closed.
 *
 * @private
 */
ThemeBuilder.Bar.prototype._saveDialogClose = function (dialogName) {
  var $ = jQuery;
  var $dialog = this.getDialog(dialogName);
  // Clear the theme name field.
  $('input', $dialog).val("");
  // Clear any error messages.
  $('.name:first', $dialog).removeClass("ui-state-error");
  $('div.error-message', $dialog).remove();
};

/**
 * Exits themebuilder with an optional user confirmation.
 *
 * @param {boolean} confirm
 *   (Optional) If true, the user is prompted to confirm before exiting the
 *   themebuilder; otherwise the themebuilder exits with no prompt.
 * @param {String} destination
 *   (Optional) The URI to which the browser should be redirected after exit.
 */
ThemeBuilder.Bar.prototype.exit = function (confirm, destination) {
  if (confirm === true && !this.exitConfirm()) {
    return;
  }

  var $ = jQuery;

  // If the themebuilder is in the process of polling the server, stop it now,
  // so that we don't get any weird errors from contacting the server in one
  // thread while the themebuilder is in the process of being closed in
  // another.
  ThemeBuilder.getApplicationInstance().forcePollingToStop();

  this.showWaitIndicator();
  this.disableThemebuilder();
  ThemeBuilder.postBack('themebuilder-exit', {}, ThemeBuilder.bind(this, this._exited, destination));
};

/**
 * This method is called after the themebuilder has exited.  It is responsible
 * for reloading the page after exit to ensure that the correct theme is being
 * used.
 *
 * @private
 *
 * @param {String}
 *   (Optional) The URI to which the browser should be redirected.
 */
ThemeBuilder.Bar.prototype._exited = function (destination) {
  var $ = jQuery;
  $('body').removeClass('themebuilder');

  // Make sure to remove the themebuilder elements so automated tests
  // fail when trying to use the themebuilder after it is closed.
  $('#themebuilder-wrapper').remove();

  // Force reload so that any CSS changes get to the browser.
  if (destination && typeof destination !== "object") {
    parent.location.assign(destination);
  }
  this.reloadPage();
};

/**
 * Prompts the user with a message before the themebuilder exits.
 *
 * @param {String} message
 *   The message that should be displayed to the user.  If no message is
 *   provided, a default message will be used instead.
 */
ThemeBuilder.Bar.prototype.exitConfirm = function (message) {
  if (!message) {
    message = 'You have unsaved changes. Discard?';
  }
  if (this.changed === false || confirm(Drupal.t(message))) {
    return true;
  }
  this.enableThemebuilder();
  return false;
};

/**
 * Sets the data in the info bar.  The info bar indicates the name of the
 * theme and the last time the theme was saved.
 *
 * @param {String} name
 *   The name of the theme currently being edited.
 */
ThemeBuilder.Bar.prototype.setInfo = function (name) {
  var $ = jQuery;
  $('#themebuilder-wrapper .theme-name')
    .html(Drupal.checkPlain(name))
    .truncate({addtitle: true});
  this.setVisibilityText();
};

/**
 * Sets the text that indicates the theme visibility based on the currently published theme and whether the draft is dirty or not.
 */
ThemeBuilder.Bar.prototype.setVisibilityText = function () {
  var $ = jQuery;
  var message;
  var selectedTheme = ThemeBuilder.Theme.getSelectedTheme();
  if (selectedTheme) {
    if (selectedTheme.isPublished() && !this.changed) {
      message = Drupal.t('(Live - everyone can see this)');
    }
    else {
      message = Drupal.t('(Draft - only you can see this)');
    }
    $('#themebuilder-theme-name .theme-visibility').text(message);
  }
};

/**
 * Sets the message of the status bar in the themebuilder.  The status bar
 * appears when there is a new message to display and then hides itself after
 * some period of time.
 *
 * @param {String} message
 *   The message to display.
 * @param {String} type
 *   The type of message, either 'info' or 'warning'.  This parameter is
 *   optional, and if omitted the message will be displayed as an 'info' type.
 */
ThemeBuilder.Bar.prototype.setStatus = function (message, type) {
  var $ = jQuery;
  // If the status bar is still visible, don't allow it to be hidden by the
  // existing timeout
  if (this._statusTimeout) {
    clearTimeout(this._statusTimeout);
    delete this._statusTimeout;
  }

  if (!type) {
    type = 'info';
  }
  $('#themebuilder-status .themebuilder-status-icon').removeClass('info').removeClass('warning').addClass(type);

  // Estimate the required width...  Pull out the tags before counting
  // characters.
  var width = this._guesstimateStatusMessageWidth(message);
  $('#themebuilder-status .themebuilder-status-message').html(message);
  $('#themebuilder-status')
    .width(width + 'px')
    .fadeTo(1000, 0.8);
  // After 10 seconds close the status tab automatically.
  this._statusTimeout = setTimeout(ThemeBuilder.bind(this, this.hideStatus), 10000);
};

/**
 * Estimates the width that the status message should be set to.
 *
 * The status message is centered in a div that is not in the normal
 * document flow.  This actually presents something of a challenge
 * because we want the text to dictate the width of the element, and
 * the width of the element to be used to center the element in the
 * window.  Since it is not in flow, we have to set the width of the
 * element, and thus we have to do a bit of ridiculous estimation to
 * make this feature match the design.
 *
 * This method works by figuring out how many characters are in the
 * actual message (by stripping out any tags) and then using a
 * multiplier of the character count.  Since a variable-width font is
 * being used, special attention is paid to space characters to try to
 * achieve a reasonable estimate.
 *
 * @private
 * @param {String} message
 *   The message markup.
 * @return {int}
 *   The estimated width.
 */
ThemeBuilder.Bar.prototype._guesstimateStatusMessageWidth = function (message) {
  var elementPadding = 47;
  var avgCharWidth = 8;
  var narrowCharOffset = -2.5;
  var wideCharOffset = 3;
  var strippedMessage = message.replace(/<[^>]*>/g, '');
  var narrowCount = strippedMessage.length - strippedMessage.replace(/[ il1]/g, '').length;
  var wideCount = strippedMessage.length - strippedMessage.replace(/[mwMW]/g, '').length;
  var width = (strippedMessage.length * avgCharWidth) + (narrowCount * narrowCharOffset) + (wideCount * wideCharOffset) + elementPadding;
  return width;
};

/**
 * Causes the info bar to indicate the theme has been modified.
 */
ThemeBuilder.Bar.prototype.indicateThemeModified = function () {
  var $ = jQuery;
  var $modified = $('#themebuilder-wrapper .theme-modified');
  if ($modified.length === 0) {
    $('<span class="theme-modified"> *</span>').insertBefore('#themebuilder-wrapper .theme-name');
  }
  this.setVisibilityText();
};

/**
 * Clears the flag that indicates the theme is dirty.
 */
ThemeBuilder.Bar.prototype.clearModifiedFlag = function () {
  var $ = jQuery;
  $('#themebuilder-wrapper .theme-modified').remove();
};

/**
 * Causes the themebuilder status bar to disappear.  This is usually invoked
 * by a timeout that is set when the status bar is displayed.
 */
ThemeBuilder.Bar.prototype.hideStatus = function () {
  var $ = jQuery;
  if (this._statusTimeout) {
    clearTimeout(this._statusTimeout);
    delete this._statusTimeout;
  }
  $('#themebuilder-status').fadeOut(1000);
};

/**
 * Causes the themebuilder to be minimized.
 */
ThemeBuilder.Bar.prototype.minimize = function () {
  var $ = jQuery;
  $('#themebuilder-wrapper').addClass('minimized');
};

/**
 * Causes the themebuilder to be maximized.
 */
ThemeBuilder.Bar.prototype.maximize = function () {
  var $ = jQuery;
  $('#themebuilder-wrapper').removeClass('minimized');
};

/**
 * Causes the themebuilder to toggle from maximized to minimized or from
 * minimized to maximized depending on the current state.
 */
ThemeBuilder.Bar.prototype.toggleMinimize = function () {
  var $ = jQuery;
  $('#themebuilder-wrapper').toggleClass('minimized');
};

/**
 * Prevents clicks on ThemeBuilder elements from propagating outside the ThemeBuilder.
 * Because we assign a click handler to the <body> in ElementPicker.js, we need to prevent
 * certain events that modify the Selector from also triggering _clickItem in ElementPicker.js
 */
ThemeBuilder.Bar.prototype.quarantineEvents = function (event) {
  event.stopPropagation();
};

/**
 * If warranted, this function displays the status message when the
 * themebuilder is initially loaded.  This is useful when a status generating
 * event is performed just before or during a page load, not providing time
 * for the user to view the message before it would be refreshed.  This is
 * accomplished by setting an array containing 'message' and 'type' fields
 * into $_SESSION['init_message'].
 *
 * @static
 *
 * @param {Object} data
 *   The application initialization data.
 */
ThemeBuilder.Bar.showInitialMessage = function (data) {
  if (data && data.initMessage) {
    ThemeBuilder.Bar.getInstance().setStatus(data.initMessage.message, data.initMessage.type);
  }
};

/**
 * If an alert has been passed to the javascript client, display it now.
 *
 * @param {Object} data
 *   Optional parameter tha provides the application initialization data.  If
 *   not provided this method will retrieve the data from the Application
 *   instance.
 */
ThemeBuilder.Bar.prototype.showInitialAlert = function (data) {
  if (!data) {
    data = ThemeBuilder.getApplicationInstance().getData();
  }

  if (data && data.initAlert) {
    alert(data.initAlert);
  }
};

/**
 * Creates an element that serves as a veil that blocks all input into the
 * themebuilder.  This is useful for controling the rate of requests the users
 * can submit using the themebuilder.
 */
ThemeBuilder.Bar.prototype._createVeil = function () {
  var $ = jQuery;
  var veil = $('<div id="themebuilder-veil"></div>').appendTo('#themebuilder-wrapper');
};

/**
 * Applies a limit to the length of the input text
 *
 * @private
 * @param {Event} event
 *   The event that this function handles
 * @param {HTML Object} field
 *   A DOM field.
 *
 * Prevent users from naming a theme with a string longer than 25 characters
 * This addresses https://backlog.acquia.com/browse/AN-26333
 *
 * This function trims the string down to 25 characters if it is longer than 25 characters.
 */
ThemeBuilder.Bar.prototype._limitInput = function (field) {
  var $ = jQuery;
  var max = 25;
  // If this method is called by an event, field will be an event
  field = (field.target) ? field.target : field;
  var $field = $(field);
  if ($field.length > 0) {
    // Trim the text down to max if it exceeds
    // The delay is necessary to allow time for the paste action to complete
    setTimeout(ThemeBuilder.bindIgnoreCallerArgs(this, this._trimField, $field, max), 200);
  }
};

/**
 * Applies the NobleCount plugin to the supplied field
 *
 * @private
 * @param {HTML Object} field
 *   A DOM field.
 *
 * Prevent users from naming a theme with a string longer than 25 characters
 * This addresses https://backlog.acquia.com/browse/AN-26333
 */
ThemeBuilder.Bar.prototype._enableLiveInputLimit = function (field) {
  var $ = jQuery;
  var max = 25;
  var $field = $(field);
  if ($field.length > 0) {
    // Add the NobleCount input limiter
    // This must be given the ID #char-count-save because the save
    // dialog isn't destroyed after it's dismissed. So the id #char-count
    // would conflict with other char-counting fields on the page.
    $('<span>', {
      id: 'char-count-save'
    }).insertAfter($field);
    $field.NobleCount('#char-count-save', {
      max_chars: max,
      block_negative: true
    });
  }
};

/**
 * Trims a field's value down to the max
 *
 * @private
 * @param {jQuery Object} $field
 *   The HTML field to be trimmed.
 * @param {int} max
 *   The maximum number of characters allowed in this field.
 */
ThemeBuilder.Bar.prototype._trimField = function ($field, max) {
  var value = $field.val();
  if (value.length > max) {
    $field.val(value.substr(0, max));
  }
  // Keydown is called to kick the NobleCounter plugin to refresh
  $field.keydown();
};

/**
 * Disables the themebuilder by displaying the veil which absorbs all input.
 */
ThemeBuilder.Bar.prototype.disableThemebuilder = function () {
  var $ = jQuery;
  $('#themebuilder-veil').addClass('show');
  this.showWaitIndicator();
};

/**
 * Enables the themebuilder by removing the veil.
 */
ThemeBuilder.Bar.prototype.enableThemebuilder = function () {
  var $ = jQuery;
  $('#themebuilder-veil').removeClass('show');
  this.hideWaitIndicator();
};

/**
 * Causes the buttons at the top of the themebuilder to be enabled.
 */
ThemeBuilder.Bar.prototype.enableButtons = function () {
  var $ = jQuery;
  $('#themebuilder-control-veil').removeClass('on');

};

/**
 * Causes the buttons at the top of the themebuilder to be disabled.
 *
 * This is important for reducing the possibility of race conditions
 * in which a commit that takes a bit too long allows the user to save
 * the theme when the theme is incomplete, thus losing css
 * customizations.
 */
ThemeBuilder.Bar.prototype.disableButtons = function () {
  var $ = jQuery;
  $('#themebuilder-control-veil').addClass('on');
};

/**
 * Adds the toolbar to the page.
 *
 * @static
 */
ThemeBuilder.Bar.attachToolbar = function () {
  // This keeps the themebuilder from dying whenever Drupal.attachBehaviors is called.
  if (ThemeBuilder.Bar.attachToolbar.attached !== undefined) {
    return;
  }
  ThemeBuilder.Bar.attachToolbar.attached = true;

  ThemeBuilder.getApplicationInstance();
  //Always add the toolbar
  jQuery('body').append(Drupal.settings.toolbarHtml);
  jQuery('#themebuilder-wrapper:not(.themebuilder-keep)').hide();
};

/**
 * This Drupal behavior causes the themebuilder toolbar to be attached to the
 * page.
 */
Drupal.behaviors.themebuilderBar = {
  attach: ThemeBuilder.Bar.attachToolbar
};
;
/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
 browser: true */

/*global ThemeBuilder: true debug: true window: true*/


/**
 * This class parses the userAgent string to determine which browser is being
 * used.  This class was written because the browser support in jquery is
 * deprecated and has a bug in which some installations of IE8 report
 * compatibility with IE8 and IE6, and the version from jquery's browser
 * object is 6 rather than 8.
 *
 * Further, this object gives us the ability to apply the detection to a
 * specified userAgent string rather than getting it from the browser.  This
 * will help support browsers that we don't even have access to by verifying
 * the user agent string is parsed and taken apart correctly.
 * @class
 */
ThemeBuilder.BrowserDetect = ThemeBuilder.initClass();

/**
 * Instantiates a new instance of the BrowserDetect class with the specified
 * string.  If no string is specified, the navigator.userAgent will be used
 * instead.
 *
 * After instantiation, the caller can look at the browser, version, and OS
 * fields to determine the browser specifics.
 *
 * @param {String} userAgent
 *   (Optional) The user agent string to apply detection to.
 */
ThemeBuilder.BrowserDetect.prototype.initialize = function (userAgent) {
  this.userAgent = userAgent || navigator.userAgent;
  this._populateData();
  this.browser = this._searchString(this.dataBrowser) || "An unknown browser";
  this.version = this._searchVersion(this.userAgent) ||
    this._searchVersion(navigator.appVersion) || "an unknown version";
  this.OS = this._searchString(this.dataOS) || "an unknown OS";
};

ThemeBuilder.BrowserDetect.prototype._searchString = function (data) {
  for (var i = 0; i < data.length; i++)	{
    var dataString = data[i].string;
    var dataProp = data[i].prop;
    this.versionSearchString = data[i].versionSearch || data[i].identity;
    if (dataString) {
      if (dataString.indexOf(data[i].subString) !== -1) {
        return data[i].identity;
      }
    }
    else if (dataProp) {
      return data[i].identity;
    }
  }
};
  
ThemeBuilder.BrowserDetect.prototype._searchVersion = function (dataString) {
  var version = null;
  var index = dataString.indexOf(this.versionSearchString);
  if (index > -1) {
    version = parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
    if (isNaN(version)) {
      version = null;
    }
  }
  return version;
};

ThemeBuilder.BrowserDetect.prototype._populateData = function () {
  this.dataBrowser = [
    {
      string: this.userAgent,
      subString: "Chrome",
      identity: "Chrome"
    },
    {
      string: this.userAgent,
      subString: "OmniWeb",
      versionSearch: "OmniWeb/",
      identity: "OmniWeb"
    },
    {
      string: navigator.vendor,
      subString: "Apple",
      identity: "Safari",
      versionSearch: "Version"
    },
    {
      string: this.userAgent,
      prop: window.opera,
      identity: "Opera"
    },
    {
      string: navigator.vendor,
      subString: "iCab",
      identity: "iCab"
    },
    {
      string: navigator.vendor,
      subString: "KDE",
      identity: "Konqueror"
    },
    {
      string: this.userAgent,
      subString: "Firefox",
      identity: "Firefox"
    },
    {
      string: navigator.vendor,
      subString: "Camino",
      identity: "Camino"
    },
    { // for newer Netscapes (6+)
      string: this.userAgent,
      subString: "Netscape",
      identity: "Netscape"
    },
    {
      string: this.userAgent,
      subString: "MSIE",
      identity: "Explorer",
      versionSearch: "MSIE"
    },
    {
      string: this.userAgent,
      subString: "Gecko",
      identity: "Mozilla",
      versionSearch: "rv"
    },
    { // for older Netscapes (4-)
      string: this.userAgent,
      subString: "Mozilla",
      identity: "Netscape",
      versionSearch: "Mozilla"
    }
  ];
  this.dataOS = [
    {
      string: navigator.platform,
      subString: "Win",
      identity: "Windows"
    },
    {
      string: navigator.platform,
      subString: "Mac",
      identity: "Mac"
    },
    {
      string: this.userAgent,
      subString: "iPhone",
      identity: "iPhone/iPod"
    },
    {
      string: navigator.platform,
      subString: "Linux",
      identity: "Linux"
    }
  ];
};
;
/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
 browser: true */

/*global jQuery: true Drupal: true ThemeBuilder: true*/
"use strict";

/**
 * The StartInteraction is an interaction that is responsible for opening the themebuilder.
 * 
 * This act is complicated by several factors including error
 * conditions that cause the open to fail, existing themebuilder
 * sessions in other webnodes, and theme corruption that might require
 * the intervention of the theme elves.
 * @class
 * @extends ThemeBuilder.InteractionController
 */
ThemeBuilder.StartInteraction = ThemeBuilder.initClass();
ThemeBuilder.StartInteraction.prototype = new ThemeBuilder.InteractionController();

ThemeBuilder.StartInteraction._lock = false;

/**
 * Constructor for the StartInteraction.
 * 
 * @param {Object} callbacks
 *   The set of callbacks that will be called upon the completion of this interaction.
 */
ThemeBuilder.StartInteraction.prototype.initialize = function (callbacks) {
  this.setInteractionTable({
    begin: 'prepareUIForOpen',
    userNotified: 'verifyWebnode',

    webnodeConfirmed: 'setCookie',
    cookieSet: 'startThemeBuilder',
    cookieNotSet: 'exitWithMessage',

    failedToGetWebnode: 'setGenericExitMessage',

    themeBuilderStarted: 'reloadPage', // This constitutes the end of this interaction.

    // The themebuilder session is open in another browser.
    editSessionInProgress: 'showTakeOverSessionConfirmation',
    takeoverAccepted: 'takeoverSession',
    takeoverCanceled: 'openCanceled',

    // Exceptions:
    openFailed: 'handleOpenFailure',
    errorOnOpen: 'invokeThemeElves',
    themeElfSuccess: 'startThemeBuilder',
    themeElfFailure: 'setGenericExitMessage',

    // Cancel the open request.
    openCanceled: 'cancelOpen',
    exitMessageSet: 'exitWithMessage',
    exitMessageDismissed: 'cancelOpen'
  });
  this.setCallbacks(callbacks);

  // Create the redirects.
  this.openCanceled = this.makeEventCallback('openCanceled');
  this.errorOnOpen = this.makeEventCallback('errorOnOpen');

  this.errorMap = ['error', 'errorName', 'errorType'];
};

/**
 * Prepares the user interface for opening the themebuilder.
 * 
 * This includes displaying a spinner to indicate the application has
 * accepted the user's request and is working.
 * 
 * If this interaction has been locked, the interaction will stop
 * immediately with no further action taken.  The lock indicates the
 * themebuilder open is already in progress, and prevents the user
 * from being able to cause multiple start processes simultaneously.
 * 
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype.prepareUIForOpen = function (data) {
  var $ = jQuery;
  if (this.isLocked()) {
    // The user is in the middle of opening the themebuilder.  Ignore the request.
    return;
  }
  this.setLock(true);
  var bar = ThemeBuilder.Bar.getInstance();
  bar.showWaitIndicator();
  Drupal.toolbar.collapse();

  // The themebuilder start options provide a mechanism for taking
  // over a themebuilder session.  By default this option is not set
  // so the user will be prompted before a session is taken.
  if (!data) {
    data = {startOptions: {}};
  }
  data.elfInvocations = 0;
  this.event(data, 'userNotified');
};

/**
 * Verifies the webnode that will be used to connect to the themebuilder.
 * 
 * If the webnode provided when the page was loaded is too old, this
 * method will request the webnode from the server.
 * 
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype.verifyWebnode = function (data) {
  // Check that we have a current server name for a cookie.  If not, request
  // one via ajax.  Set the cookie before opening the ThemeBuilder.
  var info = Drupal.settings.themebuilderServer;
  var d = new Date();
  var time = Math.floor(d.getTime() / 1000);
  if (info && info.webnode && time <= info.time) {
    // Set the webnode into the data.
    data.server = info;
    this.event(data, 'webnodeConfirmed');
  }
  else {
    // Request the webnode from the server.
    var map = [
      'server', 'type'
    ];
    ThemeBuilder.postBack('themebuilder-get-server', {}, ThemeBuilder.bind(this, this.event, map, data, 'webnodeConfirmed'), ThemeBuilder.bind(this, this.event, this.errorMap, data, 'failedToGetWebnode'));
  }
};

/**
 * Establishes a cookie that causes all requests to go to the webnode specified
 * in the parameter and causes a themebuilder edit session to open.
 * 
 * The open is accomplished by sending a request to the server, and
 * upon success the page must be reloaded.
 *
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype.setCookie = function (data) {
  var $ = jQuery;
  var webnode = data.server.webnode;
  var bar = ThemeBuilder.Bar.getInstance();

  // Note: Do not set the expires to 0.  That is the default, but this
  // results in the cookie not being set in IE.
  $.cookie('ah_app_server', data.server.webnode, {path: '/'});

  // Verify that the cookie exists.  Note that if the cookie was set
  // incorrectly, the problem is not always detectable via JavaScript,
  // but we can at least try knowing that we can't totally trust the
  // results.
  if ($.cookie('ah_app_server') === data.server.webnode) {
    this.event(data, 'cookieSet');
  }
  else {
    data.userMessage = Drupal.t("The ThemeBuilder cannot be started, possibly because your browser's privacy settings are too strict.");
    this.event(data, 'cookieNotSet');
  }
};

/**
 * Opens the themebuilder.
 * 
 * The open is accomplished by sending a request to the server, and
 * upon success the page must be reloaded.
 *
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype.startThemeBuilder = function (data) {
  var map = ['start', 'type'];
  ThemeBuilder.postBack('themebuilder-start', data.startOptions,
    ThemeBuilder.bind(this, this.event, map, data, 'themeBuilderStarted'), ThemeBuilder.bind(this, this.event, this.errorMap, data, 'openFailed'));
};

/**
 * Causes the page to refresh.
 * 
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype.reloadPage = function (data) {
  // Reload, which is required even if there are no changes to the
  // theme to make sure the gears work after the themebuilder is
  // closed.
  this.setLock(false);
  parent.location.reload(true);
};

/**
 * Handles any error condition returned from the server.
 * 
 * This method is responsible for inspecting the error and putting
 * this controller into the appropriate state to deal with the
 * problem.
 * 
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype.handleOpenFailure = function (data) {
  if (data.errorName === 'ThemeBuilderEditInProgressException') {
    this.event(data, 'editSessionInProgress');
    this.setLock(false);
  }
  if (data.errorName === 'error') {
    this.event(data, 'errorOnOpen');
  }
  this._clearError(data);
};

/**
 * Shows a confirmation dialog to take over the session.
 * 
 * If an existing TB editing session is underway in another browser and a user
 * tries to enter edit mode, this will fire.  If the user accepts, we will re-try
 * to start the session, this time forcing it to take precedence.
 * 
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype.showTakeOverSessionConfirmation = function (data) {
  var $ = jQuery;
  var message = Drupal.t('An active draft exists from a previous session.  Click Cancel if you do not want to edit the appearance in this browser, otherwise click OK to take over the draft in this window.');

  // This markup will be displayed in the dialog.
  var inputId = 'active-draft-exists';
  var $html = $('<div>').append(
    $('<img>', {
      src: Drupal.settings.themebuilderAlertImage
    }).addClass('alert-icon'),
    $('<span>', {
      html: message
    })
  );
  var dialog = new ThemeBuilder.ui.Dialog($('body'),
    {
      html: $html,
      buttons: [
        {
          label: Drupal.t('OK'),
          action: this.makeEventCallback('takeoverAccepted', data)
        },
        {
          label: Drupal.t('Cancel'),
          action: this.makeEventCallback('takeoverCanceled', data)
        }
      ],
      // The default action, which is invoked if the user hits Esc or
      // the 'x' in the dialog.
      defaultAction: this.makeEventCallback('takeoverCanceled', data)
    }
  );
};

/**
 * Causes the existing themebuilder session to be taken over.
 * 
 * This allows the user to get into the themebuilder even if they
 * already have a session open in a different browser.  The other
 * session in the other browser will be closed as a result.
 * 
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype.takeoverSession = function (data) {
  data.startOptions = {'take_over_session': true};
  this.startThemeBuilder(data);
};

/**
 * Invoked when the themebuilder open is canceled.
 * 
 * This could be due to error conditons or because the user chose 'Cancel' when the message about an existing themebuilder session appears.
 * 
 * This method is responsible for cleaning up the UI such that the
 * user can continue interacting with the site and click the
 * Appearance button again if desired.
 * 
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype.cancelOpen = function (data) {
  var bar = ThemeBuilder.Bar.getInstance();
  bar.hideWaitIndicator();
  Drupal.toolbar.expand();
  this.setLock(false);
};

/**
 * Causes the theme elves to be invoked.
 * 
 * The theme elves are server-side code that detect and correct
 * problems in themes that may prevent the themebuilder from opening.
 * If there is an error that prevents the user from starting the
 * themebuilder, it is a good idea to give the theme elves a chance to
 * fix it and try again.
 * 
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype.invokeThemeElves = function (data) {
  data.elfInvocations++;
  if (data.elfInvocations > 2) {
    // Be careful not to invoke the elves an infinite number of times.
    // It takes a substantial amount of time to run them and it is
    // very unlikely to be useful running them more than twice.
    this.event(data, 'themeElfFailure');
    return;
  }
  var map = ['recovery', 'type'];
  ThemeBuilder.postBack('themebuilder-fix-themes', {}, ThemeBuilder.bind(this, this.event, map, data, 'themeElfSuccess'), ThemeBuilder.bind(this, this.event, this.errorMap, 'themeElfFailure'));
};

/**
 * This method displays a dialog that indicates to the user that the themebuilder was unable to start.
 * 
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype.setGenericExitMessage = function (data) {
  if (Drupal.settings.gardensMisc.isSMB) {
    data.userMessage = Drupal.t('An error has occurred. Please let us know what you tried to do in the <a target="_blank" href="http://www.drupalgardens.com/forums">Drupal Gardens forums</a>, and we will look into it.');
  }
  else {
    data.userMessage = Drupal.t('An error has occurred. Please contact support to let us know what you tried to do and we will look into it.');
  }
  this.event(data, 'exitMessageSet');
};

/**
 * Retrieves the state of the lock.
 *
 * @return {boolean}
 *   true if the lock is set; false otherwise.
 */
ThemeBuilder.StartInteraction.prototype.isLocked = function () {
  return ThemeBuilder.StartInteraction._lock;
};

/**
 * Sets the state of the start lock.
 * 
 * @param {boolean} isLocked
 *   If true, the lock will be set; otherwise the lock will be cleared.
 */
ThemeBuilder.StartInteraction.prototype.setLock = function (isLocked) {
  ThemeBuilder.StartInteraction._lock = isLocked === true;
};

/**
 * Displays a dialog that presents a message stored in data.userMessage.
 * 
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype.exitWithMessage = function (data) {
  var $ = jQuery;
  var dialog = new ThemeBuilder.ui.Dialog($('body'), {
    html: $('<span>').html(data.userMessage),
    buttons: [
      {
        label: Drupal.t('OK'),
        action: this.makeEventCallback('exitMessageDismissed', data)
      }
    ]
  });
};

/**
 * Clears the error from the specified data object.
 * 
 * When an error occurs, there are fields that are added to the data
 * object that must be cleared so the error won't be detected
 * erroneously on subsequent requests.  This method clears those
 * fields so the interaction can continue.
 * 
 * @private
 * @param {Object} data
 *   The data object that is passed in to every state in the
 *   interaction.  This data object collects information from the
 *   system state and the user's choices and facilitates moving the
 *   application into the opened state.
 */
ThemeBuilder.StartInteraction.prototype._clearError = function (data) {
  delete data.error;
  delete data.errorName;
  delete data.errorType;
};
;
/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
 browser: true */

/*global window : true jQuery: true Drupal: true ThemeBuilder: true*/

ThemeBuilder = ThemeBuilder || {};

/**
 * ThemeBuilder.ui is a namespace for all User Interface wrappers that augment
 * the basic functionality of ThemeBuilder components.
 * It includes UI widgets such as Sliders, Tabs and Carousels
 * @namespace
 */
ThemeBuilder.ui = ThemeBuilder.ui || {};

/**
 * The dialog wraps a message in a jquery ui dialog with hooks for the OK and Cancel button callbacks
 * @class
 */
ThemeBuilder.ui.Dialog = ThemeBuilder.initClass();

/**
 * The constructor of the Dialog class.
 *
 * @param {DomElement} element
 *   The element is a pointer to the jQuery object that will be wrapped in the
 *   dialog.
 * @param {Object} options
 *   Options for the dialog. May contain the following optional properties:
 *   - text: Text for the message displayed in the dialog. HTML or plain text
 *     can be passed in. Defaults to 'Continue?'.
 *   - actionButton: Text displayed in the action button. Defaults to 'OK'.
 *   - cancelButton: Text displayed in the cancellation button. Defaults to
 *     'Cancel'.
 * @param {Object} callbacks
 *   Button callback functions for the dialog. May contain the following
 *   optional properties (if either of these are not set, the dialog will
 *   simply be closed when the corresponding button is clicked):
 *   - action: Callback to invoke when the action button is clicked.
 *   - cancel: Callback to invoke when the cancellation button is clicked.
 * @return {Boolean}
 *   Returns true if the dialog initializes.
 */
ThemeBuilder.ui.Dialog.prototype.initialize = function (element, options) {

  // This UI element depends on jQuery Dialog
  if (!jQuery.isFunction(jQuery().dialog)) {
    return false;
  }

  if (!options.buttons) {
    return false;
  }

  var $ = jQuery;
  this._$element = (element) ? element : $('body');
  this._$dialog = null;
  this._buttons = options.buttons;
  this._html = options.html;
  this._type = 'Dialog';
  if (options.defaultAction) {
    this._default = options.defaultAction;
  }
  else if (options.buttons.length === 1) {
    // If there is only one option, use that as the default.
    this._default = options.buttons[0].action;
  }
  // Build the DOM element
  this._build();

  return true;
};

ThemeBuilder.ui.Dialog.prototype._build = function () {
  var $ = jQuery;
  var $wrapper = $('<div>', {
    id: "themebuilder-confirmation-dialog",
    html: this._html
  }).addClass('message');
  var buttons = {};
  for (var i = 0; i < this._buttons.length; i++) {
    buttons[this._buttons[i].label] = ThemeBuilder.bind(this, this._respond, this._buttons[i].action);
  }
  $wrapper.appendTo(this._$element);
  var dialogOptions = {
    bgiframe: true,
    autoOpen: true,
    dialogClass: 'themebuilder-dialog tb',
    modal: true,
    overlay: {
      backgroundColor: '#000',
      opacity: 0.5
    },
    position: 'center',
    width: 335,
    buttons: buttons
  };
  if (this._default) {
    dialogOptions.beforeclose = this._default;
  }
  this._$dialog = $wrapper.dialog(dialogOptions);
};

/**
 * Destroys the dialog DOM element
 */
ThemeBuilder.ui.Dialog.prototype._close = function () {
  this._$dialog.remove();
};

/**
 * Returns the form data to the interaction control that instantiated this dialog
 *
 * @param {Event} event
 *   The dialog button click event
 * @param {function} action
 *   The callback associated with the button, defined by the instantiating
 *   interaction control.
 */
ThemeBuilder.ui.Dialog.prototype._respond = function (event, action) {
  var $ = jQuery,
      data = {},
      $form = $(event.target).closest('.ui-dialog').find('.ui-dialog-content');
  // Scrape all of the form data out of the dialog and store as key/value pairs
  // Input elements
  $(':input', $form).each(function (index, item) {
    var $this = $(this),
        name = $this.attr('name');
    if (name) {
      data[name] = $this.val();
    }
  });
  this._close();
  action(data);
};

/**
 * Returns a jQuery pointer to this object
 *
 * @return {object}
 *   Returns null if the carousel has no pointer.
 */
ThemeBuilder.ui.Dialog.prototype.getPointer = function () {
  if (this._$dialog) {
    return this._$dialog;
  }
  else {
    return null;
  }
};

/**
 * Utility function to remove 'px' from calculated values.  The function assumes that
 * that unit 'value' is pixels.
 *
 * @param {String} value
 *   The String containing the CSS value that includes px.
 * @return {int}
 *   Value stripped of 'px' and casted as a number or NaN if 'px' is not found in the string.
 */
ThemeBuilder.ui.Dialog.prototype._stripPX = function (value) {
  var index = value.indexOf('px');
  if (index === -1) {
    return NaN;
  }
  else {
    return Number(value.substring(0, index));
  }
};
;
/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
 browser: true */

/*global jQuery: true debug: true window: true*/
/*
 * Turns a list of links into a contextual flyout menu.
 * The menu is associated with an element on the page.
 * 
 * Author: Acquia, @jessebeach
 * Website: http://acquia.com, http://qemist.us
 *
 * items = {
 *  [
 *    {
 *      label: string,
 *      href: string (optional),
 *      itemClasses: array (optional),
 *      linkClasses: array (optional),
 *      linkWrapper: string (default: <a>, optional)
 *    }
 *  ]
 *  ...
 * }
 *
 */
(function ($) {

  // replace 'pluginName' with the name of your plugin
  $.fn.flyoutList = function (options) {

    // debug(this);

    // build main options before element iteration
    var opts = $.extend({}, $.fn.flyoutList.defaults, options);

    // iterate over matched elements
    return this.each(function () {
      var $this = $(this);
      // build element specific options. Uses the Metadata plugin if available
      // @see http://docs.jquery.com/Plugins/Metadata/metadata
      var o = $.meta ? $.extend({}, opts, $this.data()) : opts;
      // implementations
      
      if (o.items) {
        var $flyoutList = $.fn.flyoutList.buildFlyoutList(o.items).prependTo($this);
      
        var $context = o.context ? $(o.context) : $this;
        $context.css({
          position: 'relative'
        })
        .addClass('flyout-list-context');
      
        // Place the dotted outline just outside the context element
        $.fn.flyoutList.buildContextOutline($context);
      }
    });
  };
    
  // plugin defaults
  $.fn.flyoutList.defaults = {};

  // private functions definition
  $.fn.flyoutList.buildFlyoutList = function (items) {
    var $list = $('<ul>').addClass('flyout-list clearfix');
    var len = items.length;
    for (var i = 0; i < len; i++) {
      var itemClasses = ['item-' + i];
      if (items[i].itemClasses) {
        $.merge(itemClasses, items[i].itemClasses);
      }
      var linkClasses = ['action', $.fn.flyoutList.makeSafeClass('action-' + items[i].label)];
      if (items[i].linkClasses) {
        $.merge(linkClasses, items[i].linkClasses);
      }
      var linkWrapper = (items[i].linkWrapper) ? '<' + items[i].linkWrapper + '>' : '<a>';
      var linkProperties = {};
      if (items[i].label) {
        linkProperties.text = items[i].label;
      }
      else {
        linkProperties.text = "missing label";
      }
      if (items[i].href) {
        linkProperties.href = items[i].href;
      }
      
      $list.append($('<li>', {
        html: $(linkWrapper, linkProperties).addClass(linkClasses.join(' '))
      }).addClass(itemClasses.join(' ')));
    }
    return $list;
  };
  
  $.fn.flyoutList.makeSafeClass = function (s) {
    var className = s.toString().replace(new RegExp("[^a-zA-Z0-9_-]", 'g'), "-").toLowerCase();
    return className;
  };
  
  $.fn.flyoutList.buildContextOutline = function ($context) {
    $('<div>').addClass('flyout-list-outline top').prependTo($context);
    $('<div>').addClass('flyout-list-outline right').prependTo($context);
    $('<div>').addClass('flyout-list-outline bottom').prependTo($context);
    $('<div>').addClass('flyout-list-outline left').prependTo($context);
  };

  // private function for debugging
  function debug() {
    var $this = $(this);
    if (window.console && window.console.log) {
      window.console.log('selection count: ' + $this.size());
    }
  }

}(jQuery));;
(function ($) {
  // Plugins should not declare more than one namespace in the $.fn object.
  // So we declare methods in a methods array
    var methods = {
      init : function (options) {
        // build main options before element iteration
        var o = mergeOptions(options);
        // iterate over matched elements
        return this.each(function () {
          // implementations
          var visible = (!$(this).hasClass('smart-hidden'));
          if (visible) {
            hide(this, o);
          }
          else {
            show(this, o);
          }
        });
      },
      show : function (options) {
        // build main options before element iteration
        var o = mergeOptions(options);
        // iterate over matched elements
        return this.each(function () {
          show(this, o);
        });
      },
      hide : function (options) {
        // build main options before element iteration
        var o = mergeOptions(options);
        // iterate over matched elements
        return this.each(function () {
          hide(this, o);
        });
      }
    };

    // replace 'smartToggle' with the name of your plugin
    $.fn.smartToggle = function (method) {
  
      // debug(this);
      
      // Method calling logic
      if (methods[method]) {
        return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
      } else if (typeof method === 'object' || ! method) {
        return methods.init.apply(this, arguments);
      } else {
        $.error('Method ' +  method + ' does not exist on jQuery.smartToggle');
      }
    };
    
    // plugin defaults
    $.fn.smartToggle.defaults = {
      vClass: "smart-visible",
      hClass: "smart-hidden",
      speed: 750
    };
    
    // private functions definition
    function mergeOptions (options) {
      return $.extend({}, $.fn.smartToggle.defaults, options);
    }
    function show (element, options) {
      var $this = $(element);
      $this.hide(0).removeClass('smart-hidden').fadeIn(options.speed);
    }
    function hide (element, options) {
      var $this = $(element);
      $this.fadeOut(options.speed).addClass('smart-hidden').show(0);
    }
  
    // private function for debugging
    function debug() {
      var $this = $(this);
      if (window.console && window.console.log) {
        window.console.log('selection count: ' + $this.size());
      }
    }
  }
)(jQuery);;
(function(h){function j(c,a,d,b,e,f,h){var i,g;h?(i=d===0?"":a.slice(-d),g=a.slice(-b)):(i=a.slice(0,d),g=a.slice(0,b));if(e.html(g+f).width()<e.html(i+f).width())return b;g=parseInt((d+b)/2,10);i=h?a.slice(-g):a.slice(0,g);e.html(i+f);if(e.width()===c)return g;e.width()>c?b=g-1:d=g+1;return j(c,a,d,b,e,f,h)}h.fn.truncate=function(c){c=h.extend({width:"auto",token:"&hellip;",center:!1,addclass:!1,addtitle:!1},c);return this.each(function(){var a=h(this),d={fontFamily:a.css("fontFamily"),fontSize:a.css("fontSize"),
fontStyle:a.css("fontStyle"),fontWeight:a.css("fontWeight"),"font-variant":a.css("font-variant"),"text-indent":a.css("text-indent"),"text-transform":a.css("text-transform"),"letter-spacing":a.css("letter-spacing"),"word-spacing":a.css("word-spacing"),display:"none"},b=a.text();d=h("<span/>").css(d).html(b).appendTo("body");var e=d.width(),f=!isNaN(parseFloat(c.width))&&isFinite(c.width)?c.width:a.width();e>f&&(d.text(""),c.center?(f=parseInt(f/2,10)+1,e=b.slice(0,j(f,b,0,b.length,d,c.token,!1))+c.token+
b.slice(-1*j(f,b,0,b.length,d,"",!0))):e=b.slice(0,j(f,b,0,b.length,d,c.token,!1))+c.token,c.addclass&&a.addClass(c.addclass),c.addtitle&&a.attr("title",b),a.html(e));d.remove()})}})(jQuery);;
/* jQuery.NobleCount v 1.0 http://tpgblog.com/noblecount/
compiled by http://yui.2clics.net/ */
(function(c){c.fn.NobleCount=function(i,h){var j;var g=false;if(typeof i=="string"){j=c.extend({},c.fn.NobleCount.settings,h);if(typeof h!="undefined"){g=((typeof h.max_chars=="number")?true:false)}return this.each(function(){var k=c(this);f(k,i,j,g)})}return this};c.fn.NobleCount.settings={on_negative:null,on_positive:null,on_update:null,max_chars:140,block_negative:false,cloak:false,in_dom:false};function f(g,m,n,h){var l=n.max_chars;var j=c(m);if(!h){var k=j.text();var i=(/^[1-9]\d*$/).test(k);if(i){l=k}}b(g,j,n,l,true);c(g).keydown(function(o){b(g,j,n,l,false);if(a(o,g,n,l)==false){return false}});c(g).keyup(function(o){b(g,j,n,l,false);if(a(o,g,n,l)==false){return false}})}function a(k,g,l,j){if(l.block_negative){var h=k.which;var i;if(typeof document.selection!="undefined"){i=(document.selection.createRange().text.length>0)}else{i=(g[0].selectionStart!=g[0].selectionEnd)}if((!((e(g,j)<1)&&(h>47||h==32||h==0||h==13)&&!k.ctrlKey&&!k.altKey&&!i))==false){return false}}return true}function e(g,h){return h-(c(g).val()).length}function b(g,i,l,j,h){var k=e(g,j);if(k<0){d(l.on_negative,l.on_positive,g,i,l,k)}else{d(l.on_positive,l.on_negative,g,i,l,k)}if(l.cloak){if(l.in_dom){i.attr("data-noblecount",k)}}else{i.text(k)}if(!h&&jQuery.isFunction(l.on_update)){l.on_update(g,i,l,k)}}function d(i,g,h,j,l,k){if(i!=null){if(typeof i=="string"){j.addClass(i)}else{if(jQuery.isFunction(i)){i(h,j,l,k)}}}if(g!=null){if(typeof g=="string"){j.removeClass(g)}}}})(jQuery);;
/**
 * Timeago is a jQuery plugin that makes it easy to support automatically
 * updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
 *
 * @name timeago
 * @version 0.11.4
 * @requires jQuery v1.2.3+
 * @author Ryan McGeary
 * @license MIT License - http://www.opensource.org/licenses/mit-license.php
 *
 * For usage and examples, visit:
 * http://timeago.yarp.com/
 *
 * Copyright (c) 2008-2012, Ryan McGeary (ryan -[at]- mcgeary [*dot*] org)
 */
(function($) {
  $.timeago = function(timestamp) {
    if (timestamp instanceof Date) {
      return inWords(timestamp);
    } else if (typeof timestamp === "string") {
      return inWords($.timeago.parse(timestamp));
    } else if (typeof timestamp === "number") {
      return inWords(new Date(timestamp));
    } else {
      return inWords($.timeago.datetime(timestamp));
    }
  };
  var $t = $.timeago;

  $.extend($.timeago, {
    settings: {
      refreshMillis: 60000,
      allowFuture: false,
      strings: {
        prefixAgo: null,
        prefixFromNow: null,
        suffixAgo: "ago",
        suffixFromNow: "from now",
        seconds: "less than a minute",
        minute: "about a minute",
        minutes: "%d minutes",
        hour: "about an hour",
        hours: "about %d hours",
        day: "a day",
        days: "%d days",
        month: "about a month",
        months: "%d months",
        year: "about a year",
        years: "%d years",
        wordSeparator: " ",
        numbers: []
      }
    },
    inWords: function(distanceMillis) {
      var $l = this.settings.strings;
      var prefix = $l.prefixAgo;
      var suffix = $l.suffixAgo;
      if (this.settings.allowFuture) {
        if (distanceMillis < 0) {
          prefix = $l.prefixFromNow;
          suffix = $l.suffixFromNow;
        }
      }

      var seconds = Math.abs(distanceMillis) / 1000;
      var minutes = seconds / 60;
      var hours = minutes / 60;
      var days = hours / 24;
      var years = days / 365;

      function substitute(stringOrFunction, number) {
        var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
        var value = ($l.numbers && $l.numbers[number]) || number;
        return string.replace(/%d/i, value);
      }

      var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
        seconds < 90 && substitute($l.minute, 1) ||
        minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
        minutes < 90 && substitute($l.hour, 1) ||
        hours < 24 && substitute($l.hours, Math.round(hours)) ||
        hours < 42 && substitute($l.day, 1) ||
        days < 30 && substitute($l.days, Math.round(days)) ||
        days < 45 && substitute($l.month, 1) ||
        days < 365 && substitute($l.months, Math.round(days / 30)) ||
        years < 1.5 && substitute($l.year, 1) ||
        substitute($l.years, Math.round(years));

      var separator = $l.wordSeparator === undefined ?  " " : $l.wordSeparator;
      return $.trim([prefix, words, suffix].join(separator));
    },
    parse: function(iso8601) {
      var s = $.trim(iso8601);
      s = s.replace(/\.\d+/,""); // remove milliseconds
      s = s.replace(/-/,"/").replace(/-/,"/");
      s = s.replace(/T/," ").replace(/Z/," UTC");
      s = s.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // -04:00 -> -0400
      return new Date(s);
    },
    datetime: function(elem) {
      var iso8601 = $t.isTime(elem) ? $(elem).attr("datetime") : $(elem).attr("title");
      return $t.parse(iso8601);
    },
    isTime: function(elem) {
      // jQuery's `is()` doesn't play well with HTML5 in IE
      return $(elem).get(0).tagName.toLowerCase() === "time"; // $(elem).is("time");
    }
  });

  $.fn.timeago = function() {
    var self = this;
    self.each(refresh);

    var $s = $t.settings;
    if ($s.refreshMillis > 0) {
      setInterval(function() { self.each(refresh); }, $s.refreshMillis);
    }
    return self;
  };

  function refresh() {
    var data = prepareData(this);
    if (!isNaN(data.datetime)) {
      $(this).text(inWords(data.datetime));
    }
    return this;
  }

  function prepareData(element) {
    element = $(element);
    if (!element.data("timeago")) {
      element.data("timeago", { datetime: $t.datetime(element) });
      var text = $.trim(element.text());
      if (text.length > 0 && !($t.isTime(element) && element.attr("title"))) {
        element.attr("title", text);
      }
    }
    return element.data("timeago");
  }

  function inWords(date) {
    return $t.inWords(distance(date));
  }

  function distance(date) {
    return (new Date().getTime() - date.getTime());
  }

  // fix for IE6 suckage
  document.createElement("abbr");
  document.createElement("time");
}(jQuery));
;
Drupal.behaviors.timeago = {
  attach: function (context) {
    jQuery('abbr.timeago, span.timeago, time.timeago', context).timeago();
  }
};

/**
 * This allows translating string suffixes through Drupal. Some languages
 * (Arabic, Polish, Russian, Ukranian, etc.) have different suffixes depending
 * on the numbers used; see the note on Translation in the README.txt for how
 * to override the translations for these languages.
 */
jQuery.timeago.settings.strings = {
  prefixAgo: null,
  prefixFromNow: null,
  suffixAgo: Drupal.t("ago"),
  suffixFromNow: Drupal.t("from now"),
  seconds: Drupal.t("a moment"), // default is "less than a minute"
  minute: Drupal.t("about a minute"),
  minutes: Drupal.t("%d minutes"),
  hour: Drupal.t("about an hour"),
  hours: Drupal.t("about %d hours"),
  day: Drupal.t("a day"),
  days: Drupal.t("%d days"),
  month: Drupal.t("about a month"),
  months: Drupal.t("%d months"),
  year: Drupal.t("about a year"),
  years: Drupal.t("%d years")
};
// Allow timestamps in the future. https://drupal.org/node/1696742
jQuery.timeago.settings.allowFuture = true;
;
// $Id: extlink.js,v 1.8 2010/05/26 01:25:56 quicksketch Exp $
(function ($) {

Drupal.extlink = Drupal.extlink || {};

Drupal.extlink.attach = function (context, settings) {
  // Strip the host name down, removing ports, subdomains, or www.
  var pattern = /^(([^\/:]+?\.)*)([^\.:]{4,})((\.[a-z]{1,4})*)(:[0-9]{1,5})?$/;
  var host = window.location.host.replace(pattern, '$3$4');
  var subdomain = window.location.host.replace(pattern, '$1');

  // Determine what subdomains are considered internal.
  var subdomains;
  if (settings.extlink.extSubdomains) {
    subdomains = "([^/]*\\.)?";
  }
  else if (subdomain == 'www.' || subdomain == '') {
    subdomains = "(www\\.)?";
  }
  else {
    subdomains = subdomain.replace(".", "\\.");
  }

  // Build regular expressions that define an internal link.
  var internal_link = new RegExp("^https?://" + subdomains + host, "i");

  // Extra internal link matching.
  var extInclude = false;
  if (settings.extlink.extInclude) {
    extInclude = new RegExp(settings.extlink.extInclude.replace(/\\/, '\\'));
  }

  // Extra external link matching.
  var extExclude = false;
  if (settings.extlink.extExclude) {
    extExclude = new RegExp(settings.extlink.extExclude.replace(/\\/, '\\'));
  }

  // Find all links which are NOT internal and begin with http (as opposed
  // to ftp://, javascript:, etc. other kinds of links.
  // In jQuery 1.1 and higher, we'd use a filter method here, but it is not
  // available in jQuery 1.0 (Drupal 5 default).
  var external_links = new Array();
  var mailto_links = new Array();
  var potential_links = $("a:not(." + settings.extlink.extClass + ", ." + settings.extlink.mailtoClass + "), area:not(." + settings.extlink.extClass + ", ." + settings.extlink.mailtoClass + ")", context);
  var length = potential_links.length;
  var i, link;
  for (i = 0; i < length; i++) {
    // The link in this case is a native Link object, which means the host has
    // already been appended by the browser, even for local links.
    link = potential_links[i];
    try {
      var url = link.href.toLowerCase();
      if (url.indexOf('http') == 0 && (!url.match(internal_link) || (extInclude && url.match(extInclude))) && !(extExclude && url.match(extExclude))) {
        external_links.push(link);
      }
      // Do not include area tags with begin with mailto: (this prohibits
      // icons from being added to image-maps).
      else if (this.tagName != 'AREA' && url.indexOf('mailto:') == 0) {
        mailto_links.push(link);
      }
    }
    // IE7 throws errors often when dealing with irregular links, such as:
    // <a href="node/10"></a> Empty tags.
    // <a href="http://user:pass@example.com">example</a> User:pass syntax.
    catch (error) {
      return false;
    }
  }
  if (settings.extlink.extClass) {
    Drupal.extlink.applyClassAndSpan(external_links, settings.extlink.extClass);
  }

  if (settings.extlink.mailtoClass) {
    Drupal.extlink.applyClassAndSpan(mailto_links, settings.extlink.mailtoClass);
  }

  if (settings.extlink.extTarget) {
    // Apply the target attribute to all links.
    $(external_links).attr('target', settings.extlink.extTarget);
  }

  if (settings.extlink.extAlert) {
    // Add pop-up click-through dialog.
    $(external_links).click(function(e) {
      return confirm(settings.extlink.extAlertText);
    });
  }

  // Work around for Internet Explorer box model problems.
  if (($.support && !($.support.boxModel === undefined) && !$.support.boxModel) || ($.browser.msie && parseInt($.browser.version) <= 7)) {
    $('span.ext, span.mailto').css('display', 'inline-block');
  }
};

/**
 * Apply a class and a trailing <span> to all links not containing images.
 *
 * @param links
 *   An array of DOM elements representing the links.
 * @param class_name
 *   The class to apply to the links.
 */
Drupal.extlink.applyClassAndSpan = function (links, class_name) {
  var $links_to_process;
  if (parseFloat($().jquery) < 1.2) {
    $links_to_process = $(links).not('[img]');
  }
  else {
    var links_with_images = $(links).find('img').parents('a');
    $links_to_process = $(links).not(links_with_images);
  }
  $links_to_process.addClass(class_name);
  var i;
  var length = $links_to_process.length;
  for (i = 0; i < length; i++) {
    var $link = $($links_to_process[i]);
    if ($link.css('display') == 'inline') {
      $link.after('<span class=' + class_name + '></span>');
    }
  }
};

Drupal.behaviors.extlink = Drupal.behaviors.extlink || {};
Drupal.behaviors.extlink.attach = function (context, settings) {
  // Backwards compatibility, for the benefit of modules overriding extlink
  // functionality by defining an "extlinkAttach" global function.
  if (typeof extlinkAttach === 'function') {
    extlinkAttach(context);
  }
  else {
    Drupal.extlink.attach(context, settings);
  }
};

})(jQuery);
;
(function ($) {

$(document).bind('cbox_complete', function () {
  if ($.isFunction($.colorbox) && $.isFunction($.colorbox.resize)) {
    $.colorbox.resize();
  }
});

})(jQuery);
;

/*
 * Superfish v1.4.8 - jQuery menu widget
 * Copyright (c) 2008 Joel Birch
 *
 * Dual licensed under the MIT and GPL licenses:
 * 	http://www.opensource.org/licenses/mit-license.php
 * 	http://www.gnu.org/licenses/gpl.html
 *
 * CHANGELOG: http://users.tpg.com.au/j_birch/plugins/superfish/changelog.txt
 */

;(function($){
	$.fn.superfish = function(op){

		var sf = $.fn.superfish,
			c = sf.c,
			$arrow = $(['<span class="',c.arrowClass,'"> &#187;</span>'].join('')),
			over = function(){
				var $$ = $(this), menu = getMenu($$);
				clearTimeout(menu.sfTimer);
				$$.showSuperfishUl().siblings().hideSuperfishUl();
			},
			out = function(){
				var $$ = $(this), menu = getMenu($$), o = sf.op;
				clearTimeout(menu.sfTimer);
				menu.sfTimer=setTimeout(function(){
					o.retainPath=($.inArray($$[0],o.$path)>-1);
					$$.hideSuperfishUl();
					if (o.$path.length && $$.parents(['li.',o.hoverClass].join('')).length<1){over.call(o.$path);}
				},o.delay);	
			},
			getMenu = function($menu){
				var menu = $menu.parents(['ul.',c.menuClass,':first'].join(''))[0];
				sf.op = sf.o[menu.serial];
				return menu;
			},
			addArrow = function($a){ $a.addClass(c.anchorClass).append($arrow.clone()); };
			
		return this.each(function() {
			var s = this.serial = sf.o.length;
			var o = $.extend({},sf.defaults,op);
			o.$path = $('li.'+o.pathClass,this).slice(0,o.pathLevels).each(function(){
				$(this).addClass([o.hoverClass,c.bcClass].join(' '))
					.filter('li:has(ul)').removeClass(o.pathClass);
			});
			sf.o[s] = sf.op = o;

                        var hoverArg0 = o.disableHI ? over : {over: over, out: out, sensitivity: o.HISensitivity, interval: o.HIInterval, timeout: o.HITimeout},
                            hoverArg1 = o.disableHI ? out : null;
                        
			
			$('li:has(ul)',this)[($.fn.hoverIntent && !o.disableHI) ? 'hoverIntent' : 'hover'](hoverArg0, hoverArg1).each(function() {
				if (o.autoArrows) addArrow( $('>a:first-child',this) );
			})
			.not('.'+c.bcClass)
				.hideSuperfishUl();
			
			var $a = $('a',this);
			$a.each(function(i){
				var $li = $a.eq(i).parents('li');
				$a.eq(i).focus(function(){over.call($li);}).blur(function(){out.call($li);});
			});
			o.onInit.call(this);
			
		}).each(function() {
			var menuClasses = [c.menuClass];
			if (sf.op.dropShadows  && !($.browser.msie && $.browser.version < 7)) menuClasses.push(c.shadowClass);
			$(this).addClass(menuClasses.join(' '));
		});
	};

	var sf = $.fn.superfish;
	sf.o = [];
	sf.op = {};
	sf.IE7fix = function(){
		var o = sf.op;
		if ($.browser.msie && $.browser.version > 6 && o.dropShadows && o.animation.opacity!=undefined)
			this.toggleClass(sf.c.shadowClass+'-off');
		};
	sf.c = {
		bcClass     : 'menu-dropdown-breadcrumb',
		menuClass   : 'menu-dropdown-js-enabled',
		anchorClass : 'menu-dropdown-with-ul',
		arrowClass  : 'more-indicator',
		shadowClass : 'menu-dropdown-shadow'
	};
	sf.defaults = {
		hoverClass	: 'menu-dropdown-hover',
		pathClass	: 'overideThisToUse',
		pathLevels	: 1,
		delay		: 800,
		animation	: {opacity:'show'},
		speed		: 'normal',
		autoArrows	: true,
		dropShadows : true,
		disableHI	: false,		// true disables hoverIntent detection
  HISensitivity   : 2,   // HoverIntent sensitivity
  HIInterval      : 300, // HoverIntent interval
  HITimeout       : 500, // HoverIntent timeout
		onInit		: function(){}, // callback functions
		onBeforeShow: function(){},
		onShow		: function(){},
		onHide		: function(){}
	};
	$.fn.extend({
		hideSuperfishUl : function(){
			var o = sf.op,
				not = (o.retainPath===true) ? o.$path : '';
			o.retainPath = false;
			var $ul = $(['li.',o.hoverClass].join(''),this).add(this).not(not).removeClass(o.hoverClass)
					.find('>ul').hide().css('visibility','hidden');
			o.onHide.call($ul);
			return this;
		},
		showSuperfishUl : function(){
			var o = sf.op,
				sh = sf.c.shadowClass+'-off',
				$ul = this.addClass(o.hoverClass)
					.find('>ul:hidden').css('visibility','visible');
			sf.IE7fix.call($ul);
			o.onBeforeShow.call($ul);
			$ul.animate(o.animation,o.speed,function(){ sf.IE7fix.call($ul); o.onShow.call($ul); });
			return this;
		}
	});

})(jQuery);
;
/**
* hoverIntent is similar to jQuery's built-in "hover" function except that
* instead of firing the onMouseOver event immediately, hoverIntent checks
* to see if the user's mouse has slowed down (beneath the sensitivity
* threshold) before firing the onMouseOver event.
* 
* hoverIntent r5 // 2007.03.27 // jQuery 1.1.2+
* <http://cherne.net/brian/resources/jquery.hoverIntent.html>
* 
* hoverIntent is currently available for use in all personal or commercial 
* projects under both MIT and GPL licenses. This means that you can choose 
* the license that best suits your project, and use it accordingly.
* 
* // basic usage (just like .hover) receives onMouseOver and onMouseOut functions
* $("ul li").hoverIntent( showNav , hideNav );
* 
* // advanced usage receives configuration object only
* $("ul li").hoverIntent({
*	sensitivity: 7, // number = sensitivity threshold (must be 1 or higher)
*	interval: 100,   // number = milliseconds of polling interval
*	over: showNav,  // function = onMouseOver callback (required)
*	timeout: 0,   // number = milliseconds delay before onMouseOut function call
*	out: hideNav    // function = onMouseOut callback (required)
* });
* 
* @param  f  onMouseOver function || An object with configuration options
* @param  g  onMouseOut function  || Nothing (use configuration options object)
* @author    Brian Cherne <brian@cherne.net>
*/
(function($) {
	$.fn.hoverIntent = function(f,g) {
		// default configuration options
		var cfg = {
			sensitivity: 2,
			interval: 300,
			timeout: 500
		};
		// override configuration options with user supplied object
		cfg = $.extend(cfg, g ? { over: f, out: g } : f );

		// instantiate variables
		// cX, cY = current X and Y position of mouse, updated by mousemove event
		// pX, pY = previous X and Y position of mouse, set by mouseover and polling interval
		var cX, cY, pX, pY;

		// A private function for getting mouse position
		var track = function(ev) {
			cX = ev.pageX;
			cY = ev.pageY;
		};

		// A private function for comparing current and previous mouse position
		var compare = function(ev,ob) {
			ob.hoverIntent_t = clearTimeout(ob.hoverIntent_t);
			// compare mouse positions to see if they've crossed the threshold
			if ( ( Math.abs(pX-cX) + Math.abs(pY-cY) ) < cfg.sensitivity ) {
				$(ob).unbind("mousemove",track);
				// set hoverIntent state to true (so mouseOut can be called)
				ob.hoverIntent_s = 1;
				return cfg.over.apply(ob,[ev]);
			} else {
				// set previous coordinates for next time
				pX = cX; pY = cY;
				// use self-calling timeout, guarantees intervals are spaced out properly (avoids JavaScript timer bugs)
				ob.hoverIntent_t = setTimeout( function(){compare(ev, ob);} , cfg.interval );
			}
		};

		// A private function for delaying the mouseOut function
		var delay = function(ev,ob) {
			ob.hoverIntent_t = clearTimeout(ob.hoverIntent_t);
			ob.hoverIntent_s = 0;
			return cfg.out.apply(ob,[ev]);
		};

		// A private function for handling mouse 'hovering'
		var handleHover = function(e) {
			// next three lines copied from jQuery.hover, ignore children onMouseOver/onMouseOut
			var p = (e.type == "mouseover" ? e.fromElement : e.toElement) || e.relatedTarget;
			while ( p && p != this ) { try { p = p.parentNode; } catch(e) { p = this; } }
			if ( p == this ) { return false; }

			// copy objects to be passed into t (required for event object to be passed in IE)
			var ev = jQuery.extend({},e);
			var ob = this;

			// cancel hoverIntent timer if it exists
			if (ob.hoverIntent_t) { ob.hoverIntent_t = clearTimeout(ob.hoverIntent_t); }

			// else e.type == "onmouseover"
			if (e.type == "mouseover") {
				// set "previous" X and Y position based on initial entry point
				pX = ev.pageX; pY = ev.pageY;
				// update "current" X and Y position based on mousemove
				$(ob).bind("mousemove",track);
				// start polling interval (self-calling timeout) to compare mouse coordinates over time
				if (ob.hoverIntent_s != 1) { ob.hoverIntent_t = setTimeout( function(){compare(ev,ob);} , cfg.interval );}

			// else e.type == "onmouseout"
			} else {
				// unbind expensive mousemove event
				$(ob).unbind("mousemove",track);
				// if hoverIntent state is true, then call the mouseOut function after the specified delay
				if (ob.hoverIntent_s == 1) { ob.hoverIntent_t = setTimeout( function(){delay(ev,ob);} , cfg.timeout );}
			}
		};

		// bind the function to the two event listeners
		return this.mouseover(handleHover).mouseout(handleHover);
	};
})(jQuery);;
/*!
 * jQuery Cycle Plugin (with Transition Definitions)
 * Examples and documentation at: http://jquery.malsup.com/cycle/
 * Copyright (c) 2007-2009 M. Alsup
 * Version: 2.72 (09-SEP-2009)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 * Requires: jQuery v1.2.6 or later
 *
 * Originally based on the work of:
 *	1) Matt Oakes
 *	2) Torsten Baldes (http://medienfreunde.com/lab/innerfade/)
 *	3) Benjamin Sterling (http://www.benjaminsterling.com/experiments/jqShuffle/)
 */
;(function($) {

var ver = '2.72';

// if $.support is not defined (pre jQuery 1.3) add what I need
if ($.support == undefined) {
	$.support = {
		opacity: !($.browser.msie)
	};
}

function debug(s) {
	if ($.fn.cycle.debug)
		log(s);
}		
function log() {
	if (window.console && window.console.log)
		window.console.log('[cycle] ' + Array.prototype.join.call(arguments,' '));
	//$('body').append('<div>'+Array.prototype.join.call(arguments,' ')+'</div>');
};

// the options arg can be...
//   a number  - indicates an immediate transition should occur to the given slide index
//   a string  - 'stop', 'pause', 'resume', or the name of a transition effect (ie, 'fade', 'zoom', etc)
//   an object - properties to control the slideshow
//
// the arg2 arg can be...
//   the name of an fx (only used in conjunction with a numeric value for 'options')
//   the value true (only used in conjunction with a options == 'resume') and indicates
//	 that the resume should occur immediately (not wait for next timeout)

$.fn.cycle = function(options, arg2) {
	var o = { s: this.selector, c: this.context };

	// in 1.3+ we can fix mistakes with the ready state
	if (this.length === 0 && options != 'stop') {
		if (!$.isReady && o.s) {
			log('DOM not ready, queuing slideshow');
			$(function() {
				$(o.s,o.c).cycle(options,arg2);
			});
			return this;
		}
		// is your DOM ready?  http://docs.jquery.com/Tutorials:Introducing_$(document).ready()
		log('terminating; zero elements found by selector' + ($.isReady ? '' : ' (DOM not ready)'));
		return this;
	}

	// iterate the matched nodeset
	return this.each(function() {
		var opts = handleArguments(this, options, arg2);
		if (opts === false)
			return;

		// stop existing slideshow for this container (if there is one)
		if (this.cycleTimeout)
			clearTimeout(this.cycleTimeout);
		this.cycleTimeout = this.cyclePause = 0;

		var $cont = $(this);
		var $slides = opts.slideExpr ? $(opts.slideExpr, this) : $cont.children();
		var els = $slides.get();
		if (els.length < 2) {
			log('terminating; too few slides: ' + els.length);
			return;
		}

		var opts2 = buildOptions($cont, $slides, els, opts, o);
		if (opts2 === false)
			return;

		var startTime = opts2.continuous ? 10 : getTimeout(opts2.currSlide, opts2.nextSlide, opts2, !opts2.rev);

		// if it's an auto slideshow, kick it off
		if (startTime) {
			startTime += (opts2.delay || 0);
			if (startTime < 10)
				startTime = 10;
			debug('first timeout: ' + startTime);
			this.cycleTimeout = setTimeout(function(){go(els,opts2,0,!opts2.rev)}, startTime);
		}
	});
};

// process the args that were passed to the plugin fn
function handleArguments(cont, options, arg2) {
	if (cont.cycleStop == undefined)
		cont.cycleStop = 0;
	if (options === undefined || options === null)
		options = {};
	if (options.constructor == String) {
		switch(options) {
		case 'stop':
			cont.cycleStop++; // callbacks look for change
			if (cont.cycleTimeout)
				clearTimeout(cont.cycleTimeout);
			cont.cycleTimeout = 0;
			$(cont).removeData('cycle.opts');
			return false;
		case 'pause':
			cont.cyclePause = 1;
			return false;
		case 'resume':
			cont.cyclePause = 0;
			if (arg2 === true) { // resume now!
				options = $(cont).data('cycle.opts');
				if (!options) {
					log('options not found, can not resume');
					return false;
				}
				if (cont.cycleTimeout) {
					clearTimeout(cont.cycleTimeout);
					cont.cycleTimeout = 0;
				}
				go(options.elements, options, 1, 1);
			}
			return false;
		case 'prev':
		case 'next':
			var opts = $(cont).data('cycle.opts');
			if (!opts) {
				log('options not found, "prev/next" ignored');
				return false;
			}
			$.fn.cycle[options](opts);
			return false;
		default:
			options = { fx: options };
		};
		return options;
	}
	else if (options.constructor == Number) {
		// go to the requested slide
		var num = options;
		options = $(cont).data('cycle.opts');
		if (!options) {
			log('options not found, can not advance slide');
			return false;
		}
		if (num < 0 || num >= options.elements.length) {
			log('invalid slide index: ' + num);
			return false;
		}
		options.nextSlide = num;
		if (cont.cycleTimeout) {
			clearTimeout(cont.cycleTimeout);
			cont.cycleTimeout = 0;
		}
		if (typeof arg2 == 'string')
			options.oneTimeFx = arg2;
		go(options.elements, options, 1, num >= options.currSlide);
		return false;
	}
	return options;
};

function removeFilter(el, opts) {
	if (!$.support.opacity && opts.cleartype && el.style.filter) {
		try { el.style.removeAttribute('filter'); }
		catch(smother) {} // handle old opera versions
	}
};

// one-time initialization
function buildOptions($cont, $slides, els, options, o) {
	// support metadata plugin (v1.0 and v2.0)
	var opts = $.extend({}, $.fn.cycle.defaults, options || {}, $.metadata ? $cont.metadata() : $.meta ? $cont.data() : {});
	if (opts.autostop)
		opts.countdown = opts.autostopCount || els.length;

	var cont = $cont[0];
	$cont.data('cycle.opts', opts);
	opts.$cont = $cont;
	opts.stopCount = cont.cycleStop;
	opts.elements = els;
	opts.before = opts.before ? [opts.before] : [];
	opts.after = opts.after ? [opts.after] : [];
	opts.after.unshift(function(){ opts.busy=0; });

	// push some after callbacks
	if (!$.support.opacity && opts.cleartype)
		opts.after.push(function() { removeFilter(this, opts); });
	if (opts.continuous)
		opts.after.push(function() { go(els,opts,0,!opts.rev); });

	saveOriginalOpts(opts);

	// clearType corrections
	if (!$.support.opacity && opts.cleartype && !opts.cleartypeNoBg)
		clearTypeFix($slides);

	// container requires non-static position so that slides can be position within
	if ($cont.css('position') == 'static')
		$cont.css('position', 'relative');
	if (opts.width)
		$cont.width(opts.width);
	if (opts.height && opts.height != 'auto')
		$cont.height(opts.height);

	if (opts.startingSlide)
		opts.startingSlide = parseInt(opts.startingSlide);

	// if random, mix up the slide array
	if (opts.random) {
		opts.randomMap = [];
		for (var i = 0; i < els.length; i++)
			opts.randomMap.push(i);
		opts.randomMap.sort(function(a,b) {return Math.random() - 0.5;});
		opts.randomIndex = 0;
		opts.startingSlide = opts.randomMap[0];
	}
	else if (opts.startingSlide >= els.length)
		opts.startingSlide = 0; // catch bogus input
	opts.currSlide = opts.startingSlide = opts.startingSlide || 0;
	var first = opts.startingSlide;

	// set position and zIndex on all the slides
	$slides.css({position: 'absolute', top:0, left:0}).hide().each(function(i) {
		var z = first ? i >= first ? els.length - (i-first) : first-i : els.length-i;
		$(this).css('z-index', z)
	});

	// make sure first slide is visible
	$(els[first]).css('opacity',1).show(); // opacity bit needed to handle restart use case
	removeFilter(els[first], opts);

	// stretch slides
	if (opts.fit && opts.width)
		$slides.width(opts.width);
	if (opts.fit && opts.height && opts.height != 'auto')
		$slides.height(opts.height);

	// stretch container
	var reshape = opts.containerResize && !$cont.innerHeight();
	if (reshape) { // do this only if container has no size http://tinyurl.com/da2oa9
		var maxw = 0, maxh = 0;
		for(var j=0; j < els.length; j++) {
			var $e = $(els[j]), e = $e[0], w = $e.outerWidth(), h = $e.outerHeight();
			if (!w) w = e.offsetWidth;
			if (!h) h = e.offsetHeight;
			maxw = w > maxw ? w : maxw;
			maxh = h > maxh ? h : maxh;
		}
		if (maxw > 0 && maxh > 0)
			$cont.css({width:maxw+'px',height:maxh+'px'});
	}

	if (opts.pause)
		$cont.hover(function(){this.cyclePause++;},function(){this.cyclePause--;});

	if (supportMultiTransitions(opts) === false)
		return false;

	// apparently a lot of people use image slideshows without height/width attributes on the images.
	// Cycle 2.50+ requires the sizing info for every slide; this block tries to deal with that.
	var requeue = false;
	options.requeueAttempts = options.requeueAttempts || 0;
	$slides.each(function() {
		// try to get height/width of each slide
		var $el = $(this);
		this.cycleH = (opts.fit && opts.height) ? opts.height : $el.height();
		this.cycleW = (opts.fit && opts.width) ? opts.width : $el.width();

		if ( $el.is('img') ) {
			// sigh..  sniffing, hacking, shrugging...  this crappy hack tries to account for what browsers do when
			// an image is being downloaded and the markup did not include sizing info (height/width attributes);
			// there seems to be some "default" sizes used in this situation
			var loadingIE	= ($.browser.msie  && this.cycleW == 28 && this.cycleH == 30 && !this.complete);
			var loadingFF	= ($.browser.mozilla && this.cycleW == 34 && this.cycleH == 19 && !this.complete);
			var loadingOp	= ($.browser.opera && ((this.cycleW == 42 && this.cycleH == 19) || (this.cycleW == 37 && this.cycleH == 17)) && !this.complete);
			var loadingOther = (this.cycleH == 0 && this.cycleW == 0 && !this.complete);
			// don't requeue for images that are still loading but have a valid size
			if (loadingIE || loadingFF || loadingOp || loadingOther) {
				if (o.s && opts.requeueOnImageNotLoaded && ++options.requeueAttempts < 100) { // track retry count so we don't loop forever
					log(options.requeueAttempts,' - img slide not loaded, requeuing slideshow: ', this.src, this.cycleW, this.cycleH);
					setTimeout(function() {$(o.s,o.c).cycle(options)}, opts.requeueTimeout);
					requeue = true;
					return false; // break each loop
				}
				else {
					log('could not determine size of image: '+this.src, this.cycleW, this.cycleH);
				}
			}
		}
		return true;
	});

	if (requeue)
		return false;

	opts.cssBefore = opts.cssBefore || {};
	opts.animIn = opts.animIn || {};
	opts.animOut = opts.animOut || {};

	$slides.not(':eq('+first+')').css(opts.cssBefore);
	if (opts.cssFirst)
		$($slides[first]).css(opts.cssFirst);

	if (opts.timeout) {
		opts.timeout = parseInt(opts.timeout);
		// ensure that timeout and speed settings are sane
		if (opts.speed.constructor == String)
			opts.speed = $.fx.speeds[opts.speed] || parseInt(opts.speed);
		if (!opts.sync)
			opts.speed = opts.speed / 2;
		while((opts.timeout - opts.speed) < 250) // sanitize timeout
			opts.timeout += opts.speed;
	}
	if (opts.easing)
		opts.easeIn = opts.easeOut = opts.easing;
	if (!opts.speedIn)
		opts.speedIn = opts.speed;
	if (!opts.speedOut)
		opts.speedOut = opts.speed;

	opts.slideCount = els.length;
	opts.currSlide = opts.lastSlide = first;
	if (opts.random) {
		opts.nextSlide = opts.currSlide;
		if (++opts.randomIndex == els.length)
			opts.randomIndex = 0;
		opts.nextSlide = opts.randomMap[opts.randomIndex];
	}
	else
		opts.nextSlide = opts.startingSlide >= (els.length-1) ? 0 : opts.startingSlide+1;

	// run transition init fn
	if (!opts.multiFx) {
		var init = $.fn.cycle.transitions[opts.fx];
		if ($.isFunction(init))
			init($cont, $slides, opts);
		else if (opts.fx != 'custom' && !opts.multiFx) {
			log('unknown transition: ' + opts.fx,'; slideshow terminating');
			return false;
		}
	}

	// fire artificial events
	var e0 = $slides[first];
	if (opts.before.length)
		opts.before[0].apply(e0, [e0, e0, opts, true]);
	if (opts.after.length > 1)
		opts.after[1].apply(e0, [e0, e0, opts, true]);

	if (opts.next)
		$(opts.next).bind(opts.prevNextEvent,function(){return advance(opts,opts.rev?-1:1)});
	if (opts.prev)
		$(opts.prev).bind(opts.prevNextEvent,function(){return advance(opts,opts.rev?1:-1)});
	if (opts.pager)
		buildPager(els,opts);

	exposeAddSlide(opts, els);

	return opts;
};

// save off original opts so we can restore after clearing state
function saveOriginalOpts(opts) {
	opts.original = { before: [], after: [] };
	opts.original.cssBefore = $.extend({}, opts.cssBefore);
	opts.original.cssAfter  = $.extend({}, opts.cssAfter);
	opts.original.animIn	= $.extend({}, opts.animIn);
	opts.original.animOut   = $.extend({}, opts.animOut);
	$.each(opts.before, function() { opts.original.before.push(this); });
	$.each(opts.after,  function() { opts.original.after.push(this); });
};

function supportMultiTransitions(opts) {
	var i, tx, txs = $.fn.cycle.transitions;
	// look for multiple effects
	if (opts.fx.indexOf(',') > 0) {
		opts.multiFx = true;
		opts.fxs = opts.fx.replace(/\s*/g,'').split(',');
		// discard any bogus effect names
		for (i=0; i < opts.fxs.length; i++) {
			var fx = opts.fxs[i];
			tx = txs[fx];
			if (!tx || !txs.hasOwnProperty(fx) || !$.isFunction(tx)) {
				log('discarding unknown transition: ',fx);
				opts.fxs.splice(i,1);
				i--;
			}
		}
		// if we have an empty list then we threw everything away!
		if (!opts.fxs.length) {
			log('No valid transitions named; slideshow terminating.');
			return false;
		}
	}
	else if (opts.fx == 'all') {  // auto-gen the list of transitions
		opts.multiFx = true;
		opts.fxs = [];
		for (p in txs) {
			tx = txs[p];
			if (txs.hasOwnProperty(p) && $.isFunction(tx))
				opts.fxs.push(p);
		}
	}
	if (opts.multiFx && opts.randomizeEffects) {
		// munge the fxs array to make effect selection random
		var r1 = Math.floor(Math.random() * 20) + 30;
		for (i = 0; i < r1; i++) {
			var r2 = Math.floor(Math.random() * opts.fxs.length);
			opts.fxs.push(opts.fxs.splice(r2,1)[0]);
		}
		debug('randomized fx sequence: ',opts.fxs);
	}
	return true;
};

// provide a mechanism for adding slides after the slideshow has started
function exposeAddSlide(opts, els) {
	opts.addSlide = function(newSlide, prepend) {
		var $s = $(newSlide), s = $s[0];
		if (!opts.autostopCount)
			opts.countdown++;
		els[prepend?'unshift':'push'](s);
		if (opts.els)
			opts.els[prepend?'unshift':'push'](s); // shuffle needs this
		opts.slideCount = els.length;

		$s.css('position','absolute');
		$s[prepend?'prependTo':'appendTo'](opts.$cont);

		if (prepend) {
			opts.currSlide++;
			opts.nextSlide++;
		}

		if (!$.support.opacity && opts.cleartype && !opts.cleartypeNoBg)
			clearTypeFix($s);

		if (opts.fit && opts.width)
			$s.width(opts.width);
		if (opts.fit && opts.height && opts.height != 'auto')
			$slides.height(opts.height);
		s.cycleH = (opts.fit && opts.height) ? opts.height : $s.height();
		s.cycleW = (opts.fit && opts.width) ? opts.width : $s.width();

		$s.css(opts.cssBefore);

		if (opts.pager)
			$.fn.cycle.createPagerAnchor(els.length-1, s, $(opts.pager), els, opts);

		if ($.isFunction(opts.onAddSlide))
			opts.onAddSlide($s);
		else
			$s.hide(); // default behavior
	};
}

// reset internal state; we do this on every pass in order to support multiple effects
$.fn.cycle.resetState = function(opts, fx) {
	fx = fx || opts.fx;
	opts.before = []; opts.after = [];
	opts.cssBefore = $.extend({}, opts.original.cssBefore);
	opts.cssAfter  = $.extend({}, opts.original.cssAfter);
	opts.animIn	= $.extend({}, opts.original.animIn);
	opts.animOut   = $.extend({}, opts.original.animOut);
	opts.fxFn = null;
	$.each(opts.original.before, function() { opts.before.push(this); });
	$.each(opts.original.after,  function() { opts.after.push(this); });

	// re-init
	var init = $.fn.cycle.transitions[fx];
	if ($.isFunction(init))
		init(opts.$cont, $(opts.elements), opts);
};

// this is the main engine fn, it handles the timeouts, callbacks and slide index mgmt
function go(els, opts, manual, fwd) {
	// opts.busy is true if we're in the middle of an animation
	if (manual && opts.busy && opts.manualTrump) {
		// let manual transitions requests trump active ones
		$(els).stop(true,true);
		opts.busy = false;
	}
	// don't begin another timeout-based transition if there is one active
	if (opts.busy)
		return;

	var p = opts.$cont[0], curr = els[opts.currSlide], next = els[opts.nextSlide];

	// stop cycling if we have an outstanding stop request
	if (p.cycleStop != opts.stopCount || p.cycleTimeout === 0 && !manual)
		return;

	// check to see if we should stop cycling based on autostop options
	if (!manual && !p.cyclePause &&
		((opts.autostop && (--opts.countdown <= 0)) ||
		(opts.nowrap && !opts.random && opts.nextSlide < opts.currSlide))) {
		if (opts.end)
			opts.end(opts);
		return;
	}

	// if slideshow is paused, only transition on a manual trigger
	if (manual || !p.cyclePause) {
		var fx = opts.fx;
		// keep trying to get the slide size if we don't have it yet
		curr.cycleH = curr.cycleH || $(curr).height();
		curr.cycleW = curr.cycleW || $(curr).width();
		next.cycleH = next.cycleH || $(next).height();
		next.cycleW = next.cycleW || $(next).width();

		// support multiple transition types
		if (opts.multiFx) {
			if (opts.lastFx == undefined || ++opts.lastFx >= opts.fxs.length)
				opts.lastFx = 0;
			fx = opts.fxs[opts.lastFx];
			opts.currFx = fx;
		}

		// one-time fx overrides apply to:  $('div').cycle(3,'zoom');
		if (opts.oneTimeFx) {
			fx = opts.oneTimeFx;
			opts.oneTimeFx = null;
		}

		$.fn.cycle.resetState(opts, fx);

		// run the before callbacks
		if (opts.before.length)
			$.each(opts.before, function(i,o) {
				if (p.cycleStop != opts.stopCount) return;
				o.apply(next, [curr, next, opts, fwd]);
			});

		// stage the after callacks
		var after = function() {
			$.each(opts.after, function(i,o) {
				if (p.cycleStop != opts.stopCount) return;
				o.apply(next, [curr, next, opts, fwd]);
			});
		};

		if (opts.nextSlide != opts.currSlide) {
			// get ready to perform the transition
			opts.busy = 1;
			if (opts.fxFn) // fx function provided?
				opts.fxFn(curr, next, opts, after, fwd);
			else if ($.isFunction($.fn.cycle[opts.fx])) // fx plugin ?
				$.fn.cycle[opts.fx](curr, next, opts, after);
			else
				$.fn.cycle.custom(curr, next, opts, after, manual && opts.fastOnEvent);
		}

		// calculate the next slide
		opts.lastSlide = opts.currSlide;
		if (opts.random) {
			opts.currSlide = opts.nextSlide;
			if (++opts.randomIndex == els.length)
				opts.randomIndex = 0;
			opts.nextSlide = opts.randomMap[opts.randomIndex];
		}
		else { // sequence
			var roll = (opts.nextSlide + 1) == els.length;
			opts.nextSlide = roll ? 0 : opts.nextSlide+1;
			opts.currSlide = roll ? els.length-1 : opts.nextSlide-1;
		}

		if (opts.pager)
			$.fn.cycle.updateActivePagerLink(opts.pager, opts.currSlide);
	}

	// stage the next transtion
	var ms = 0;
	if (opts.timeout && !opts.continuous)
		ms = getTimeout(curr, next, opts, fwd);
	else if (opts.continuous && p.cyclePause) // continuous shows work off an after callback, not this timer logic
		ms = 10;
	if (ms > 0)
		p.cycleTimeout = setTimeout(function(){ go(els, opts, 0, !opts.rev) }, ms);
};

// invoked after transition
$.fn.cycle.updateActivePagerLink = function(pager, currSlide) {
	$(pager).find('a').removeClass('activeSlide').filter('a:eq('+currSlide+')').addClass('activeSlide');
};

// calculate timeout value for current transition
function getTimeout(curr, next, opts, fwd) {
	if (opts.timeoutFn) {
		// call user provided calc fn
		var t = opts.timeoutFn(curr,next,opts,fwd);
		while ((t - opts.speed) < 250) // sanitize timeout
			t += opts.speed;
		debug('calculated timeout: ' + t + '; speed: ' + opts.speed);
		if (t !== false)
			return t;
	}
	return opts.timeout;
};

// expose next/prev function, caller must pass in state
$.fn.cycle.next = function(opts) { advance(opts, opts.rev?-1:1); };
$.fn.cycle.prev = function(opts) { advance(opts, opts.rev?1:-1);};

// advance slide forward or back
function advance(opts, val) {
	var els = opts.elements;
	var p = opts.$cont[0], timeout = p.cycleTimeout;
	if (timeout) {
		clearTimeout(timeout);
		p.cycleTimeout = 0;
	}
	if (opts.random && val < 0) {
		// move back to the previously display slide
		opts.randomIndex--;
		if (--opts.randomIndex == -2)
			opts.randomIndex = els.length-2;
		else if (opts.randomIndex == -1)
			opts.randomIndex = els.length-1;
		opts.nextSlide = opts.randomMap[opts.randomIndex];
	}
	else if (opts.random) {
		if (++opts.randomIndex == els.length)
			opts.randomIndex = 0;
		opts.nextSlide = opts.randomMap[opts.randomIndex];
	}
	else {
		opts.nextSlide = opts.currSlide + val;
		if (opts.nextSlide < 0) {
			if (opts.nowrap) return false;
			opts.nextSlide = els.length - 1;
		}
		else if (opts.nextSlide >= els.length) {
			if (opts.nowrap) return false;
			opts.nextSlide = 0;
		}
	}

	if ($.isFunction(opts.prevNextClick))
		opts.prevNextClick(val > 0, opts.nextSlide, els[opts.nextSlide]);
	go(els, opts, 1, val>=0);
	return false;
};

function buildPager(els, opts) {
	var $p = $(opts.pager);
	$.each(els, function(i,o) {
		$.fn.cycle.createPagerAnchor(i,o,$p,els,opts);
	});
   $.fn.cycle.updateActivePagerLink(opts.pager, opts.startingSlide);
};

$.fn.cycle.createPagerAnchor = function(i, el, $p, els, opts) {
	var a;
	if ($.isFunction(opts.pagerAnchorBuilder))
		a = opts.pagerAnchorBuilder(i,el);
	else
		a = '<a href="#">'+(i+1)+'</a>';
		
	if (!a)
		return;
	var $a = $(a);
	// don't reparent if anchor is in the dom
	if ($a.parents('body').length === 0) {
		var arr = [];
		if ($p.length > 1) {
			$p.each(function() {
				var $clone = $a.clone(true);
				$(this).append($clone);
				arr.push($clone);
			});
			$a = $(arr);
		}
		else {
			$a.appendTo($p);
		}
	}

	$a.bind(opts.pagerEvent, function(e) {
		e.preventDefault();
		opts.nextSlide = i;
		var p = opts.$cont[0], timeout = p.cycleTimeout;
		if (timeout) {
			clearTimeout(timeout);
			p.cycleTimeout = 0;
		}
		if ($.isFunction(opts.pagerClick))
			opts.pagerClick(opts.nextSlide, els[opts.nextSlide]);
		go(els,opts,1,opts.currSlide < i); // trigger the trans
		return false;
	});
	
	if (opts.pagerEvent != 'click')
		$a.click(function(){return false;}); // supress click
	
	if (opts.pauseOnPagerHover)
		$a.hover(function() { opts.$cont[0].cyclePause++; }, function() { opts.$cont[0].cyclePause--; } );
};

// helper fn to calculate the number of slides between the current and the next
$.fn.cycle.hopsFromLast = function(opts, fwd) {
	var hops, l = opts.lastSlide, c = opts.currSlide;
	if (fwd)
		hops = c > l ? c - l : opts.slideCount - l;
	else
		hops = c < l ? l - c : l + opts.slideCount - c;
	return hops;
};

// fix clearType problems in ie6 by setting an explicit bg color
// (otherwise text slides look horrible during a fade transition)
function clearTypeFix($slides) {
	function hex(s) {
		s = parseInt(s).toString(16);
		return s.length < 2 ? '0'+s : s;
	};
	function getBg(e) {
		for ( ; e && e.nodeName.toLowerCase() != 'html'; e = e.parentNode) {
			var v = $.css(e,'background-color');
			if (v.indexOf('rgb') >= 0 ) {
				var rgb = v.match(/\d+/g);
				return '#'+ hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
			}
			if (v && v != 'transparent')
				return v;
		}
		return '#ffffff';
	};
	$slides.each(function() { $(this).css('background-color', getBg(this)); });
};

// reset common props before the next transition
$.fn.cycle.commonReset = function(curr,next,opts,w,h,rev) {
	$(opts.elements).not(curr).hide();
	opts.cssBefore.opacity = 1;
	opts.cssBefore.display = 'block';
	if (w !== false && next.cycleW > 0)
		opts.cssBefore.width = next.cycleW;
	if (h !== false && next.cycleH > 0)
		opts.cssBefore.height = next.cycleH;
	opts.cssAfter = opts.cssAfter || {};
	opts.cssAfter.display = 'none';
	$(curr).css('zIndex',opts.slideCount + (rev === true ? 1 : 0));
	$(next).css('zIndex',opts.slideCount + (rev === true ? 0 : 1));
};

// the actual fn for effecting a transition
$.fn.cycle.custom = function(curr, next, opts, cb, speedOverride) {
	var $l = $(curr), $n = $(next);
	var speedIn = opts.speedIn, speedOut = opts.speedOut, easeIn = opts.easeIn, easeOut = opts.easeOut;
	$n.css(opts.cssBefore);
	if (speedOverride) {
		if (typeof speedOverride == 'number')
			speedIn = speedOut = speedOverride;
		else
			speedIn = speedOut = 1;
		easeIn = easeOut = null;
	}
	var fn = function() {$n.animate(opts.animIn, speedIn, easeIn, cb)};
	$l.animate(opts.animOut, speedOut, easeOut, function() {
		if (opts.cssAfter) $l.css(opts.cssAfter);
		if (!opts.sync) fn();
	});
	if (opts.sync) fn();
};

// transition definitions - only fade is defined here, transition pack defines the rest
$.fn.cycle.transitions = {
	fade: function($cont, $slides, opts) {
		$slides.not(':eq('+opts.currSlide+')').css('opacity',0);
		opts.before.push(function(curr,next,opts) {
			$.fn.cycle.commonReset(curr,next,opts);
			opts.cssBefore.opacity = 0;
		});
		opts.animIn	   = { opacity: 1 };
		opts.animOut   = { opacity: 0 };
		opts.cssBefore = { top: 0, left: 0 };
	}
};

$.fn.cycle.ver = function() { return ver; };

// override these globally if you like (they are all optional)
$.fn.cycle.defaults = {
	fx:			  'fade', // name of transition effect (or comma separated names, ex: fade,scrollUp,shuffle)
	timeout:	   4000,  // milliseconds between slide transitions (0 to disable auto advance)
	timeoutFn:	 null,  // callback for determining per-slide timeout value:  function(currSlideElement, nextSlideElement, options, forwardFlag)
	continuous:	   0,	  // true to start next transition immediately after current one completes
	speed:		   1000,  // speed of the transition (any valid fx speed value)
	speedIn:	   null,  // speed of the 'in' transition
	speedOut:	   null,  // speed of the 'out' transition
	next:		   null,  // selector for element to use as click trigger for next slide
	prev:		   null,  // selector for element to use as click trigger for previous slide
	prevNextClick: null,  // callback fn for prev/next clicks:	function(isNext, zeroBasedSlideIndex, slideElement)
	prevNextEvent:'click',// event which drives the manual transition to the previous or next slide
	pager:		   null,  // selector for element to use as pager container
	pagerClick:	   null,  // callback fn for pager clicks:	function(zeroBasedSlideIndex, slideElement)
	pagerEvent:	  'click', // name of event which drives the pager navigation
	pagerAnchorBuilder: null, // callback fn for building anchor links:  function(index, DOMelement)
	before:		   null,  // transition callback (scope set to element to be shown):	 function(currSlideElement, nextSlideElement, options, forwardFlag)
	after:		   null,  // transition callback (scope set to element that was shown):  function(currSlideElement, nextSlideElement, options, forwardFlag)
	end:		   null,  // callback invoked when the slideshow terminates (use with autostop or nowrap options): function(options)
	easing:		   null,  // easing method for both in and out transitions
	easeIn:		   null,  // easing for "in" transition
	easeOut:	   null,  // easing for "out" transition
	shuffle:	   null,  // coords for shuffle animation, ex: { top:15, left: 200 }
	animIn:		   null,  // properties that define how the slide animates in
	animOut:	   null,  // properties that define how the slide animates out
	cssBefore:	   null,  // properties that define the initial state of the slide before transitioning in
	cssAfter:	   null,  // properties that defined the state of the slide after transitioning out
	fxFn:		   null,  // function used to control the transition: function(currSlideElement, nextSlideElement, options, afterCalback, forwardFlag)
	height:		  'auto', // container height
	startingSlide: 0,	  // zero-based index of the first slide to be displayed
	sync:		   1,	  // true if in/out transitions should occur simultaneously
	random:		   0,	  // true for random, false for sequence (not applicable to shuffle fx)
	fit:		   0,	  // force slides to fit container
	containerResize: 1,	  // resize container to fit largest slide
	pause:		   0,	  // true to enable "pause on hover"
	pauseOnPagerHover: 0, // true to pause when hovering over pager link
	autostop:	   0,	  // true to end slideshow after X transitions (where X == slide count)
	autostopCount: 0,	  // number of transitions (optionally used with autostop to define X)
	delay:		   0,	  // additional delay (in ms) for first transition (hint: can be negative)
	slideExpr:	   null,  // expression for selecting slides (if something other than all children is required)
	cleartype:	   !$.support.opacity,  // true if clearType corrections should be applied (for IE)
	cleartypeNoBg: false, // set to true to disable extra cleartype fixing (leave false to force background color setting on slides)
	nowrap:		   0,	  // true to prevent slideshow from wrapping
	fastOnEvent:   0,	  // force fast transitions when triggered manually (via pager or prev/next); value == time in ms
	randomizeEffects: 1,  // valid when multiple effects are used; true to make the effect sequence random
	rev:		   0,	 // causes animations to transition in reverse
	manualTrump:   true,  // causes manual transition to stop an active transition instead of being ignored
	requeueOnImageNotLoaded: true, // requeue the slideshow if any image slides are not yet loaded
	requeueTimeout: 250   // ms delay for requeue
};

})(jQuery);


/*!
 * jQuery Cycle Plugin Transition Definitions
 * This script is a plugin for the jQuery Cycle Plugin
 * Examples and documentation at: http://malsup.com/jquery/cycle/
 * Copyright (c) 2007-2008 M. Alsup
 * Version:	 2.72
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 */
(function($) {

//
// These functions define one-time slide initialization for the named
// transitions. To save file size feel free to remove any of these that you
// don't need.
//
$.fn.cycle.transitions.none = function($cont, $slides, opts) {
	opts.fxFn = function(curr,next,opts,after){
		$(next).show();
		$(curr).hide();
		after();
	};
}

// scrollUp/Down/Left/Right
$.fn.cycle.transitions.scrollUp = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push($.fn.cycle.commonReset);
	var h = $cont.height();
	opts.cssBefore ={ top: h, left: 0 };
	opts.cssFirst = { top: 0 };
	opts.animIn	  = { top: 0 };
	opts.animOut  = { top: -h };
};
$.fn.cycle.transitions.scrollDown = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push($.fn.cycle.commonReset);
	var h = $cont.height();
	opts.cssFirst = { top: 0 };
	opts.cssBefore= { top: -h, left: 0 };
	opts.animIn	  = { top: 0 };
	opts.animOut  = { top: h };
};
$.fn.cycle.transitions.scrollLeft = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push($.fn.cycle.commonReset);
	var w = $cont.width();
	opts.cssFirst = { left: 0 };
	opts.cssBefore= { left: w, top: 0 };
	opts.animIn	  = { left: 0 };
	opts.animOut  = { left: 0-w };
};
$.fn.cycle.transitions.scrollRight = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push($.fn.cycle.commonReset);
	var w = $cont.width();
	opts.cssFirst = { left: 0 };
	opts.cssBefore= { left: -w, top: 0 };
	opts.animIn	  = { left: 0 };
	opts.animOut  = { left: w };
};
$.fn.cycle.transitions.scrollHorz = function($cont, $slides, opts) {
	$cont.css('overflow','hidden').width();
	opts.before.push(function(curr, next, opts, fwd) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.cssBefore.left = fwd ? (next.cycleW-1) : (1-next.cycleW);
		opts.animOut.left = fwd ? -curr.cycleW : curr.cycleW;
	});
	opts.cssFirst = { left: 0 };
	opts.cssBefore= { top: 0 };
	opts.animIn   = { left: 0 };
	opts.animOut  = { top: 0 };
};
$.fn.cycle.transitions.scrollVert = function($cont, $slides, opts) {
	$cont.css('overflow','hidden');
	opts.before.push(function(curr, next, opts, fwd) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.cssBefore.top = fwd ? (1-next.cycleH) : (next.cycleH-1);
		opts.animOut.top = fwd ? curr.cycleH : -curr.cycleH;
	});
	opts.cssFirst = { top: 0 };
	opts.cssBefore= { left: 0 };
	opts.animIn   = { top: 0 };
	opts.animOut  = { left: 0 };
};

// slideX/slideY
$.fn.cycle.transitions.slideX = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$(opts.elements).not(curr).hide();
		$.fn.cycle.commonReset(curr,next,opts,false,true);
		opts.animIn.width = next.cycleW;
	});
	opts.cssBefore = { left: 0, top: 0, width: 0 };
	opts.animIn	 = { width: 'show' };
	opts.animOut = { width: 0 };
};
$.fn.cycle.transitions.slideY = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$(opts.elements).not(curr).hide();
		$.fn.cycle.commonReset(curr,next,opts,true,false);
		opts.animIn.height = next.cycleH;
	});
	opts.cssBefore = { left: 0, top: 0, height: 0 };
	opts.animIn	 = { height: 'show' };
	opts.animOut = { height: 0 };
};

// shuffle
$.fn.cycle.transitions.shuffle = function($cont, $slides, opts) {
	var i, w = $cont.css('overflow', 'visible').width();
	$slides.css({left: 0, top: 0});
	opts.before.push(function(curr,next,opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,true,true);
	});
	// only adjust speed once!
	if (!opts.speedAdjusted) {
		opts.speed = opts.speed / 2; // shuffle has 2 transitions
		opts.speedAdjusted = true;
	}
	opts.random = 0;
	opts.shuffle = opts.shuffle || {left:-w, top:15};
	opts.els = [];
	for (i=0; i < $slides.length; i++)
		opts.els.push($slides[i]);

	for (i=0; i < opts.currSlide; i++)
		opts.els.push(opts.els.shift());

	// custom transition fn (hat tip to Benjamin Sterling for this bit of sweetness!)
	opts.fxFn = function(curr, next, opts, cb, fwd) {
		var $el = fwd ? $(curr) : $(next);
		$(next).css(opts.cssBefore);
		var count = opts.slideCount;
		$el.animate(opts.shuffle, opts.speedIn, opts.easeIn, function() {
			var hops = $.fn.cycle.hopsFromLast(opts, fwd);
			for (var k=0; k < hops; k++)
				fwd ? opts.els.push(opts.els.shift()) : opts.els.unshift(opts.els.pop());
			if (fwd) {
				for (var i=0, len=opts.els.length; i < len; i++)
					$(opts.els[i]).css('z-index', len-i+count);
			}
			else {
				var z = $(curr).css('z-index');
				$el.css('z-index', parseInt(z)+1+count);
			}
			$el.animate({left:0, top:0}, opts.speedOut, opts.easeOut, function() {
				$(fwd ? this : curr).hide();
				if (cb) cb();
			});
		});
	};
	opts.cssBefore = { display: 'block', opacity: 1, top: 0, left: 0 };
};

// turnUp/Down/Left/Right
$.fn.cycle.transitions.turnUp = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,false);
		opts.cssBefore.top = next.cycleH;
		opts.animIn.height = next.cycleH;
	});
	opts.cssFirst  = { top: 0 };
	opts.cssBefore = { left: 0, height: 0 };
	opts.animIn	   = { top: 0 };
	opts.animOut   = { height: 0 };
};
$.fn.cycle.transitions.turnDown = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,false);
		opts.animIn.height = next.cycleH;
		opts.animOut.top   = curr.cycleH;
	});
	opts.cssFirst  = { top: 0 };
	opts.cssBefore = { left: 0, top: 0, height: 0 };
	opts.animOut   = { height: 0 };
};
$.fn.cycle.transitions.turnLeft = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,true);
		opts.cssBefore.left = next.cycleW;
		opts.animIn.width = next.cycleW;
	});
	opts.cssBefore = { top: 0, width: 0  };
	opts.animIn	   = { left: 0 };
	opts.animOut   = { width: 0 };
};
$.fn.cycle.transitions.turnRight = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,true);
		opts.animIn.width = next.cycleW;
		opts.animOut.left = curr.cycleW;
	});
	opts.cssBefore = { top: 0, left: 0, width: 0 };
	opts.animIn	   = { left: 0 };
	opts.animOut   = { width: 0 };
};

// zoom
$.fn.cycle.transitions.zoom = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,false,true);
		opts.cssBefore.top = next.cycleH/2;
		opts.cssBefore.left = next.cycleW/2;
		opts.animIn	   = { top: 0, left: 0, width: next.cycleW, height: next.cycleH };
		opts.animOut   = { width: 0, height: 0, top: curr.cycleH/2, left: curr.cycleW/2 };
	});
	opts.cssFirst = { top:0, left: 0 };
	opts.cssBefore = { width: 0, height: 0 };
};

// fadeZoom
$.fn.cycle.transitions.fadeZoom = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,false);
		opts.cssBefore.left = next.cycleW/2;
		opts.cssBefore.top = next.cycleH/2;
		opts.animIn	= { top: 0, left: 0, width: next.cycleW, height: next.cycleH };
	});
	opts.cssBefore = { width: 0, height: 0 };
	opts.animOut  = { opacity: 0 };
};

// blindX
$.fn.cycle.transitions.blindX = function($cont, $slides, opts) {
	var w = $cont.css('overflow','hidden').width();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.animIn.width = next.cycleW;
		opts.animOut.left   = curr.cycleW;
	});
	opts.cssBefore = { left: w, top: 0 };
	opts.animIn = { left: 0 };
	opts.animOut  = { left: w };
};
// blindY
$.fn.cycle.transitions.blindY = function($cont, $slides, opts) {
	var h = $cont.css('overflow','hidden').height();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.animIn.height = next.cycleH;
		opts.animOut.top   = curr.cycleH;
	});
	opts.cssBefore = { top: h, left: 0 };
	opts.animIn = { top: 0 };
	opts.animOut  = { top: h };
};
// blindZ
$.fn.cycle.transitions.blindZ = function($cont, $slides, opts) {
	var h = $cont.css('overflow','hidden').height();
	var w = $cont.width();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts);
		opts.animIn.height = next.cycleH;
		opts.animOut.top   = curr.cycleH;
	});
	opts.cssBefore = { top: h, left: w };
	opts.animIn = { top: 0, left: 0 };
	opts.animOut  = { top: h, left: w };
};

// growX - grow horizontally from centered 0 width
$.fn.cycle.transitions.growX = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,true);
		opts.cssBefore.left = this.cycleW/2;
		opts.animIn = { left: 0, width: this.cycleW };
		opts.animOut = { left: 0 };
	});
	opts.cssBefore = { width: 0, top: 0 };
};
// growY - grow vertically from centered 0 height
$.fn.cycle.transitions.growY = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,false);
		opts.cssBefore.top = this.cycleH/2;
		opts.animIn = { top: 0, height: this.cycleH };
		opts.animOut = { top: 0 };
	});
	opts.cssBefore = { height: 0, left: 0 };
};

// curtainX - squeeze in both edges horizontally
$.fn.cycle.transitions.curtainX = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,false,true,true);
		opts.cssBefore.left = next.cycleW/2;
		opts.animIn = { left: 0, width: this.cycleW };
		opts.animOut = { left: curr.cycleW/2, width: 0 };
	});
	opts.cssBefore = { top: 0, width: 0 };
};
// curtainY - squeeze in both edges vertically
$.fn.cycle.transitions.curtainY = function($cont, $slides, opts) {
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,false,true);
		opts.cssBefore.top = next.cycleH/2;
		opts.animIn = { top: 0, height: next.cycleH };
		opts.animOut = { top: curr.cycleH/2, height: 0 };
	});
	opts.cssBefore = { left: 0, height: 0 };
};

// cover - curr slide covered by next slide
$.fn.cycle.transitions.cover = function($cont, $slides, opts) {
	var d = opts.direction || 'left';
	var w = $cont.css('overflow','hidden').width();
	var h = $cont.height();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts);
		if (d == 'right')
			opts.cssBefore.left = -w;
		else if (d == 'up')
			opts.cssBefore.top = h;
		else if (d == 'down')
			opts.cssBefore.top = -h;
		else
			opts.cssBefore.left = w;
	});
	opts.animIn = { left: 0, top: 0};
	opts.animOut = { opacity: 1 };
	opts.cssBefore = { top: 0, left: 0 };
};

// uncover - curr slide moves off next slide
$.fn.cycle.transitions.uncover = function($cont, $slides, opts) {
	var d = opts.direction || 'left';
	var w = $cont.css('overflow','hidden').width();
	var h = $cont.height();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,true,true);
		if (d == 'right')
			opts.animOut.left = w;
		else if (d == 'up')
			opts.animOut.top = -h;
		else if (d == 'down')
			opts.animOut.top = h;
		else
			opts.animOut.left = -w;
	});
	opts.animIn = { left: 0, top: 0 };
	opts.animOut = { opacity: 1 };
	opts.cssBefore = { top: 0, left: 0 };
};

// toss - move top slide and fade away
$.fn.cycle.transitions.toss = function($cont, $slides, opts) {
	var w = $cont.css('overflow','visible').width();
	var h = $cont.height();
	opts.before.push(function(curr, next, opts) {
		$.fn.cycle.commonReset(curr,next,opts,true,true,true);
		// provide default toss settings if animOut not provided
		if (!opts.animOut.left && !opts.animOut.top)
			opts.animOut = { left: w*2, top: -h/2, opacity: 0 };
		else
			opts.animOut.opacity = 0;
	});
	opts.cssBefore = { left: 0, top: 0 };
	opts.animIn = { left: 0 };
};

// wipe - clip animation
$.fn.cycle.transitions.wipe = function($cont, $slides, opts) {
	var w = $cont.css('overflow','hidden').width();
	var h = $cont.height();
	opts.cssBefore = opts.cssBefore || {};
	var clip;
	if (opts.clip) {
		if (/l2r/.test(opts.clip))
			clip = 'rect(0px 0px '+h+'px 0px)';
		else if (/r2l/.test(opts.clip))
			clip = 'rect(0px '+w+'px '+h+'px '+w+'px)';
		else if (/t2b/.test(opts.clip))
			clip = 'rect(0px '+w+'px 0px 0px)';
		else if (/b2t/.test(opts.clip))
			clip = 'rect('+h+'px '+w+'px '+h+'px 0px)';
		else if (/zoom/.test(opts.clip)) {
			var top = parseInt(h/2);
			var left = parseInt(w/2);
			clip = 'rect('+top+'px '+left+'px '+top+'px '+left+'px)';
		}
	}

	opts.cssBefore.clip = opts.cssBefore.clip || clip || 'rect(0px 0px 0px 0px)';

	var d = opts.cssBefore.clip.match(/(\d+)/g);
	var t = parseInt(d[0]), r = parseInt(d[1]), b = parseInt(d[2]), l = parseInt(d[3]);

	opts.before.push(function(curr, next, opts) {
		if (curr == next) return;
		var $curr = $(curr), $next = $(next);
		$.fn.cycle.commonReset(curr,next,opts,true,true,false);
		opts.cssAfter.display = 'block';

		var step = 1, count = parseInt((opts.speedIn / 13)) - 1;
		(function f() {
			var tt = t ? t - parseInt(step * (t/count)) : 0;
			var ll = l ? l - parseInt(step * (l/count)) : 0;
			var bb = b < h ? b + parseInt(step * ((h-b)/count || 1)) : h;
			var rr = r < w ? r + parseInt(step * ((w-r)/count || 1)) : w;
			$next.css({ clip: 'rect('+tt+'px '+rr+'px '+bb+'px '+ll+'px)' });
			(step++ <= count) ? setTimeout(f, 13) : $curr.css('display', 'none');
		})();
	});
	opts.cssBefore = { display: 'block', opacity: 1, top: 0, left: 0 };
	opts.animIn	   = { left: 0 };
	opts.animOut   = { left: 0 };
};

})(jQuery);
;

/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
 browser: true */

/*global jQuery: true Drupal: true window: true */

(function ($) {
  Drupal.behaviors.rotatingBanner = {
    attach: function (context) {
      $('.rotating-banner', context).once('jCycleActivated', function () {
        if (!Drupal.settings.rotatingBanners) {
          return;
        }
        var settings = Drupal.settings.rotatingBanners[this.id].cycle;
        if ($.fn.cycle === 'undefined' || $.fn.cycle === undefined) {
          alert(Drupal.t('Jquery Cycle is not installed and is required by the rotating_banner module.\n\nSee the README.txt'));
          return;
        }

        settings.fit = 1;
        settings.cleartypeNoBg = true;

        if(Drupal.settings.rotatingBanners[this.id].controls == 'prev_next') {
          settings.prev = "#" + this.id + " .prev";
          settings.next = "#" + this.id + " .next";
        } else {
          settings.pager = "#" + this.id + " .controls";
        }
				
        $('.rb-slides', this).cycle(settings);
      });
    }
  };
})(jQuery);
;
/*
 * jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/
 *
 * Uses the built in easing capabilities added In jQuery 1.1
 * to offer multiple easing options
 *
 * TERMS OF USE - jQuery Easing
 * 
 * Open source under the BSD License. 
 * 
 * Copyright © 2008 George McGinley Smith
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this list of 
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list 
 * of conditions and the following disclaimer in the documentation and/or other materials 
 * provided with the distribution.
 * 
 * Neither the name of the author nor the names of contributors may be used to endorse 
 * or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 *  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 *  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
 * OF THE POSSIBILITY OF SUCH DAMAGE. 
 *
*/

// t: current time, b: begInnIng value, c: change In value, d: duration
jQuery.easing['jswing'] = jQuery.easing['swing'];

jQuery.extend( jQuery.easing,
{
	def: 'easeOutQuad',
	swing: function (x, t, b, c, d) {
		//alert(jQuery.easing.default);
		return jQuery.easing[jQuery.easing.def](x, t, b, c, d);
	},
	easeInQuad: function (x, t, b, c, d) {
		return c*(t/=d)*t + b;
	},
	easeOutQuad: function (x, t, b, c, d) {
		return -c *(t/=d)*(t-2) + b;
	},
	easeInOutQuad: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t + b;
		return -c/2 * ((--t)*(t-2) - 1) + b;
	},
	easeInCubic: function (x, t, b, c, d) {
		return c*(t/=d)*t*t + b;
	},
	easeOutCubic: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t + 1) + b;
	},
	easeInOutCubic: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t + b;
		return c/2*((t-=2)*t*t + 2) + b;
	},
	easeInQuart: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t + b;
	},
	easeOutQuart: function (x, t, b, c, d) {
		return -c * ((t=t/d-1)*t*t*t - 1) + b;
	},
	easeInOutQuart: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
		return -c/2 * ((t-=2)*t*t*t - 2) + b;
	},
	easeInQuint: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t*t + b;
	},
	easeOutQuint: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t*t*t + 1) + b;
	},
	easeInOutQuint: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
		return c/2*((t-=2)*t*t*t*t + 2) + b;
	},
	easeInSine: function (x, t, b, c, d) {
		return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
	},
	easeOutSine: function (x, t, b, c, d) {
		return c * Math.sin(t/d * (Math.PI/2)) + b;
	},
	easeInOutSine: function (x, t, b, c, d) {
		return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
	},
	easeInExpo: function (x, t, b, c, d) {
		return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
	},
	easeOutExpo: function (x, t, b, c, d) {
		return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
	},
	easeInOutExpo: function (x, t, b, c, d) {
		if (t==0) return b;
		if (t==d) return b+c;
		if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
		return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
	},
	easeInCirc: function (x, t, b, c, d) {
		return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
	},
	easeOutCirc: function (x, t, b, c, d) {
		return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
	},
	easeInOutCirc: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
		return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
	},
	easeInElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
	},
	easeOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
	},
	easeInOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
	},
	easeInBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*(t/=d)*t*((s+1)*t - s) + b;
	},
	easeOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
	},
	easeInOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158; 
		if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
		return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
	},
	easeInBounce: function (x, t, b, c, d) {
		return c - jQuery.easing.easeOutBounce (x, d-t, 0, c, d) + b;
	},
	easeOutBounce: function (x, t, b, c, d) {
		if ((t/=d) < (1/2.75)) {
			return c*(7.5625*t*t) + b;
		} else if (t < (2/2.75)) {
			return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
		} else if (t < (2.5/2.75)) {
			return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
		} else {
			return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
		}
	},
	easeInOutBounce: function (x, t, b, c, d) {
		if (t < d/2) return jQuery.easing.easeInBounce (x, t*2, 0, c, d) * .5 + b;
		return jQuery.easing.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
	}
});

/*
 *
 * TERMS OF USE - EASING EQUATIONS
 * 
 * Open source under the BSD License. 
 * 
 * Copyright © 2001 Robert Penner
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this list of 
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list 
 * of conditions and the following disclaimer in the documentation and/or other materials 
 * provided with the distribution.
 * 
 * Neither the name of the author nor the names of contributors may be used to endorse 
 * or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 *  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 *  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
 * OF THE POSSIBILITY OF SUCH DAMAGE. 
 *
 */;
Drupal.behaviors.mediaGalleryColorbox = {};

Drupal.behaviors.mediaGalleryColorbox.attach = function (context, settings) {
  var $ = jQuery, $galleries, $gallery, href, $links, $link, $dummyLinksPre, $dummyLinksPost, i, j;
  if ($.fn.colorbox) {
    // Add a colorbox group for each media gallery field on the page.
    $galleries = $('.field-name-media-gallery-media');
    for (i = 0; i < $galleries.length; i++) {
      $gallery = $($galleries[i]);
      $links = $('a.cbEnabled', $gallery);
      $dummyLinksPre = $gallery.parent().find('ul:has(a.colorbox-supplemental-link.pre)');
      $dummyLinksPost = $gallery.parent().find('ul:has(a.colorbox-supplemental-link.post)');
      $dummyLinksPost.appendTo($gallery);
      $links = $links.add('a', $dummyLinksPre).add('a', $dummyLinksPost);
      $links.attr('rel', 'colorbox-' + i);
      for (j = 0; j < $links.length; j++) {
        // Change the link href to point to the lightbox version of the media.
        $link = $($links[j]);
        href = $link.attr('href');
        $link.attr('href', href.replace(/\/detail\/([0-9]+)\/([0-9]+)/, '/lightbox/$1/$2'));
      }
      $links.not('.meta-wrapper').colorbox({
        slideshow: true,
        slideshowAuto: false,
        slideshowStart: Drupal.t('Slideshow'),
        slideshowStop: '[' + Drupal.t('stop slideshow') + ']',
        slideshowSpeed: 4000,
        current: Drupal.t('Item !current of !total', {'!current':'{current}', '!total':'{total}'}),
        innerWidth: 'auto',
        // If 'title' evaluates to false, Colorbox will use the title from the
        // underlying <a> element, which we don't want. Using a space is the
        // officially approved workaround. See
        // http://groups.google.com/group/colorbox/msg/7671ae69708950bf
        title: ' ',
        transition: 'fade',
        preloading: true,
        fastIframe: false,
        onComplete: function () {
          $(this).colorbox.resize();
        }
      });
    }
    $('a.meta-wrapper').bind('click', Drupal.mediaGalleryColorbox.metaClick);
    // Subscribe to the media_youtube module's load event, so we can pause
    // the slideshow and play the video.
    $(window).bind('media_youtube_load', Drupal.mediaGalleryColorbox.handleMediaYoutubeLoad);
  }
};

Drupal.mediaGalleryColorbox = {};

/**
 * Handles the click event on the metadata.
 */
Drupal.mediaGalleryColorbox.metaClick = function (event) {
  event.preventDefault();
  jQuery(this).prev('.media-gallery-item').find('a.cbEnabled').click();
};

/**
 * Handles the media_youtube module's load event.
 *
 * If the colorbox slideshow is playing, and it gets to a video, the video
 * should play automatically, and the slideshow should pause until it's done.
 */
Drupal.mediaGalleryColorbox.handleMediaYoutubeLoad = function (event, videoSettings) {
  var $ = jQuery;
  var slideshowOn = $('#colorbox').hasClass('cboxSlideshow_on');
  // Set a width on a wrapper for the video so that the colorbox will size properly.
  $('#colorbox .media-gallery-item').width(videoSettings.width + 'px').height(videoSettings.height + 'px');
  if (slideshowOn) {
    videoSettings.options.autoplay = 1;
    $('#cboxSlideshow')
      // Turn off the slideshow while the video is playing.
      .click() // No, there is not a better way.
      .text('[' + Drupal.t('resume slideshow') + ']');
      // TODO: If YouTube makes its JavaScript API available for iframe videos,
      // set the slideshow to restart when the video is done playing.
  }
};
;
(function ($) {

Drupal.toolbar = Drupal.toolbar || {};

/**
 * Attach toggling behavior and notify the overlay of the toolbar.
 */
Drupal.behaviors.toolbar = {
  attach: function(context) {

    // Set the initial state of the toolbar.
    $('#toolbar', context).once('toolbar', Drupal.toolbar.init);

    // Toggling toolbar drawer.
    $('#toolbar a.toggle', context).once('toolbar-toggle').click(function(e) {
      Drupal.toolbar.toggle();
      // Allow resize event handlers to recalculate sizes/positions.
      $(window).triggerHandler('resize');
      return false;
    });
  }
};

/**
 * Retrieve last saved cookie settings and set up the initial toolbar state.
 */
Drupal.toolbar.init = function() {
  // Retrieve the collapsed status from a stored cookie.
  var collapsed = $.cookie('Drupal.toolbar.collapsed');

  // Expand or collapse the toolbar based on the cookie value.
  if (collapsed == 1) {
    Drupal.toolbar.collapse();
  }
  else {
    Drupal.toolbar.expand();
  }
};

/**
 * Collapse the toolbar.
 */
Drupal.toolbar.collapse = function() {
  var toggle_text = Drupal.t('Show shortcuts');
  $('#toolbar div.toolbar-drawer').addClass('collapsed');
  $('#toolbar a.toggle')
    .removeClass('toggle-active')
    .attr('title',  toggle_text)
    .html(toggle_text);
  $('body').removeClass('toolbar-drawer').css('paddingTop', Drupal.toolbar.height());
  $.cookie(
    'Drupal.toolbar.collapsed',
    1,
    {
      path: Drupal.settings.basePath,
      // The cookie should "never" expire.
      expires: 36500
    }
  );
};

/**
 * Expand the toolbar.
 */
Drupal.toolbar.expand = function() {
  var toggle_text = Drupal.t('Hide shortcuts');
  $('#toolbar div.toolbar-drawer').removeClass('collapsed');
  $('#toolbar a.toggle')
    .addClass('toggle-active')
    .attr('title',  toggle_text)
    .html(toggle_text);
  $('body').addClass('toolbar-drawer').css('paddingTop', Drupal.toolbar.height());
  $.cookie(
    'Drupal.toolbar.collapsed',
    0,
    {
      path: Drupal.settings.basePath,
      // The cookie should "never" expire.
      expires: 36500
    }
  );
};

/**
 * Toggle the toolbar.
 */
Drupal.toolbar.toggle = function() {
  if ($('#toolbar div.toolbar-drawer').hasClass('collapsed')) {
    Drupal.toolbar.expand();
  }
  else {
    Drupal.toolbar.collapse();
  }
};

Drupal.toolbar.height = function() {
  var $toolbar = $('#toolbar');
  var height = $toolbar.outerHeight();
  // In modern browsers (including IE9), when box-shadow is defined, use the
  // normal height.
  var cssBoxShadowValue = $toolbar.css('box-shadow');
  var boxShadow = (typeof cssBoxShadowValue !== 'undefined' && cssBoxShadowValue !== 'none');
  // In IE8 and below, we use the shadow filter to apply box-shadow styles to
  // the toolbar. It adds some extra height that we need to remove.
  if (!boxShadow && /DXImageTransform\.Microsoft\.Shadow/.test($toolbar.css('filter'))) {
    height -= $toolbar[0].filters.item("DXImageTransform.Microsoft.Shadow").strength;
  }
  return height;
};

})(jQuery);
;
/* Based on overlay-parent.js,v 1.22 2010/01/14 04:06:54 webchick */

(function ($) {

// Only act if overlay is found.
if (!Drupal.overlay) {
  return;
}

/**
 * Event handler: opens or closes the overlay based on the current URL fragment.
 *
 * @param event
 *   Event being triggered, with the following restrictions:
 *   - event.type: hashchange
 *   - event.currentTarget: document
 *
 * Overrides the same method from overlay-parent.js
 */
Drupal.overlay.eventhandlerOperateByURLFragment = function (event) {
  // If we changed the hash to reflect an internal redirect in the overlay,
  // its location has already been changed, so don't do anything.
  if ($.data(window.location, window.location.href) === 'redirect') {
    $.data(window.location, window.location.href, null);
    return;
  }

  // Get the overlay URL from the current URL fragment.
  var state = $.bbq.getState('overlay');
  if (state) {
    // Append render variable, so the server side can choose the right
    // rendering and add child frame code to the page if needed.
    var url = $.param.querystring(Drupal.settings.basePath + state, { render: 'overlay' });

    this.open(url);
    this.resetActiveClass(this.getPath(Drupal.settings.basePath + state));

    // @gardens: look for gardener specific paths.
    var isGardener = (state.indexOf('gardener/') > -1);
    if (isGardener) {
      // Ok, now we can tell the parent window we're ready.
      // @todo revisit this to use the overlay API more properly.
      $(this.inactiveFrame).addClass('overlay-active');
    }
  }

  // If there is no overlay URL in the fragment and the overlay is (still)
  // open, close the overlay.
  else if (this.isOpen && !this.isClosing) {
    this.close();
    this.resetActiveClass(this.getPath(window.location));
  }
};

})(jQuery);
;
(function($) {

Drupal.behaviors.gardensHelp = {
  attach: function(context) {
          Drupal.gardensHelp.init(context);
  }
};

Drupal.gardensHelp = Drupal.gardensHelp || {};

Drupal.gardensHelp.init = function(context) {
  // Move help area to inside the toolbar, so the toolbar resizes with it.
  var helpHeader = $('#help-header').html();
  $('#help-header').remove();
  $('#toolbar').prepend('<div id="help-header" style="display: none;">' + helpHeader + '</div>');

  // Bind our click handler to the help item.
  $('#toolbar-user .help a', context).bind('click', Drupal.gardensHelp.open);

  // Bind search submission handler to search form.
  $('#gardens-help-search-form').bind('submit', Drupal.gardensHelp.searchSubmit);

  // Bind links in the help header so that they will open a single new window
  $('#help-header a').bind('click', Drupal.gardensHelp.helpClick);
};

Drupal.gardensHelp.open = function() {
  $("#help-header").slideToggle("slow", Drupal.gardensHelp.positionOverlay);
  $("#toolbar-user .help").toggleClass("help-active");
  // Blur the link so that the :active suedo-class doesn't cause it to have the grey background
  $("#toolbar-user .help a").blur();
  return false;
};

Drupal.gardensHelp.positionOverlay = function() {
  // As the toolbar is an overlay displaced region, overlay should be
  // notified of it's height change to adapt its position.
  $('body').css('paddingTop', Drupal.toolbar.height());
  $(window).triggerHandler('resize.overlay-event');

  // Porting the fix for IE and the slideToggle from the Gardener
  var wrapper = $(this).parent();
  if (wrapper.css('zoom') != 1) {
    wrapper.css('zoom', 1);
  } else {
    wrapper.css('zoom', '');
  }
}

Drupal.gardensHelp.searchSubmit = function(event) {
  // This method needs to work the same way as the link click handler so that it doesn't create an additional window
  event.preventDefault();
  if (Drupal.gardensHelp.helpWindow) {
          Drupal.gardensHelp.helpWindow.close();
  }
  // The Gardener will read the URL arguments and take care of the lack of a POST submition
  Drupal.gardensHelp.helpWindow = window.open(Drupal.settings.gardenerHelpSearchURL + '/search/apachesolr_search/' + $('#gardens-help-search-query').val(), 'gardens_help');

}

Drupal.gardensHelp.helpClick = function (event) {
  // Stop normal link behavior
  event.preventDefault();

  // If there has already been a window created by the help drop down, close it.  Creating a new window will put focus on that window.
  if (Drupal.gardensHelp.helpWindow) {
    Drupal.gardensHelp.helpWindow.close();
  }
  Drupal.gardensHelp.helpWindow = window.open($(event.target).attr('href'), 'gardens_help');
};

})(jQuery);
;
/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
 browser: true */

/*global jQuery: true debug: true Drupal: true window: true */

var ThemeBuilder = ThemeBuilder || {};
ThemeBuilder.styleEditor = ThemeBuilder.styleEditor || {};

/**
 * @class
 */
Drupal.behaviors.themebuilderBarLast = {
  attach: function (context, settings) {
    ThemeBuilder.initializeUI();
  }
};

/**
 * Initializes the initial state of the themebuilder.
 */
ThemeBuilder.initializeUI = function () {
  ThemeBuilder.addThemeEditButton();

  if (jQuery('body').hasClass('themebuilder')) {
    ThemeBuilder.open();
  }
  else {
    ThemeBuilder.close();
  }
};

/**
 * Overrides the "Appearance" toolbar button so that it launches themebuilder.
 */
ThemeBuilder.addThemeEditButton = function () {
  // Strip the 'admin/appearance' href from the "Appearance" toolbar link.
  // We can't use '#' as the href, because if we do, the link will show up
  // as highlighted when the overlay is closed and the hash changes to '#'.
  var $toolbarLink = jQuery('#toolbar-link-admin-appearance').removeAttr('href').css('cursor', 'pointer');

  // @see: function themebuilder_compiler_preprocess_html()
  // The themebuilder is disabled if we're using an admin theme, for example.
  if (!jQuery('body').hasClass('themebuilder-disabled')) {
    // Avoid attaching multiple event listeners.
    $toolbarLink.unbind('click', ThemeBuilder._appearanceButtonCallback);
    $toolbarLink.click(ThemeBuilder._appearanceButtonCallback);
  }
};

/**
 * Determines whether the browser being used is supported by the themebuilder.
 *
 * @return {boolean}
 *   true if the browser is supported; false otherwise.
 */
ThemeBuilder.browserSupported = function () {
  var browserOk = false;
  var browserDetect = new ThemeBuilder.BrowserDetect();
  switch (browserDetect.browser) {
  case 'Mozilla':
  case 'Firefox':
    browserOk = (parseFloat(browserDetect.version) >= 1.9);
    break;

  case 'Explorer':
    browserOk = (parseFloat(browserDetect.version) >= 8.0);
    break;

  case 'Safari':
    browserOk = true;
    break;

  case 'Chrome':
    browserOk = true;
    break;

  default:
  }
  return browserOk;
};

/**
 * Called when the appearance button is clicked.
 */
ThemeBuilder._appearanceButtonCallback = function () {
  // If the themebuilder is open and an overlay is open, 
  // clicking the appearance button will close the overlay
  // instead of acting on the themebuilder
  if (jQuery('body').hasClass('themebuilder') && Drupal.overlay.isOpen) {
    jQuery.bbq.removeState('overlay');
    return false;
  }
  if (ThemeBuilder.browserSupported()) {
    // This is idempotent, so no need to check if themebuilder is
    // open already.
    var bar = ThemeBuilder.Bar.getInstance();
    bar.openThemebuilder();
  }
  else {
    alert("Editing your site's appearance requires one of the following browsers: Firefox version 3.0 or higher, Internet Explorer 8, Safari 4, or Google Chrome 4.");
  }
  return false;
};

/**
 * Opens the themebuilder.  This function causes the shortcuts bar to disappear
 * and opens the themebuilder panel.
 */
ThemeBuilder.open = function () {
  if (jQuery('div.toolbar-shortcuts')) {
    Drupal.toolbar.collapse();
  }

  // Convert any embed tags into placeholder images to not break z-index
  jQuery('embed').each(ThemeBuilder.embedReplace);

  // Make sure the initialization data has been received.
  var app = ThemeBuilder.getApplicationInstance();
  var appData = app.getData();
  if (!appData) {
    app.addApplicationInitializer(ThemeBuilder.open);
    return;
  }
  app.addApplicationInitializer(ThemeBuilder.applicationDataInitialized);
  app.addUpdateListener(ThemeBuilder.applicationDataUpdated);
  var bar = ThemeBuilder.Bar.getInstance();
  bar.show();
  ThemeBuilder.populateUndoStack();
  ThemeBuilder.undoStack.addChangeListener(bar);
  ThemeBuilder.redoStack.addChangeListener(bar);
  bar.stackChanged();
};

/**
 * Closes the themebuilder panel.
 */
ThemeBuilder.close = function () {
  if (Drupal.toolbar) {
    Drupal.toolbar.expand();
  }
  var bar = ThemeBuilder.Bar.getInstance(false);
  if (bar && ThemeBuilder.undoStack) {
    ThemeBuilder.undoStack.removeChangeListener(bar);
    ThemeBuilder.redoStack.addChangeListener(bar);
  }
};

ThemeBuilder.embedReplace = function (index, element) {
  var $ = jQuery;
  var h = $(element).height();
  var w = $(element).width();

  var placeholder = $('<div class="flash-content tb-no-select" title="Flash content not available while Themebuilding"></div>').css({'height': h, 'width': w});

  $(element).replaceWith(placeholder);
};

/**
 * Called when the application data is initialized.
 *
 * @param {Array} data
 *   The initial application data returned from the server.
 */
ThemeBuilder.applicationDataInitialized = function (data) {
  // Trigger any behaviors that the server side code requested to be triggered.
  ThemeBuilder.triggerBehaviors(data);
};

/**
 * Called when the application data has changed.
 *
 * @param {Array} data
 *   The set of application data that changed.
 */
ThemeBuilder.applicationDataUpdated = function (data) {
  // Look for a change to the maintenance mode state and alert the user to save
  // their theme.
  if (data.maintenance_mode === true) {
    alert(Drupal.t('The ThemeBuilder will soon be undergoing a brief maintenance period.  Please save your work and close the ThemeBuilder.'));
  }
  else if (data.maintenance_mode === false) {
    // Probably don't need a message when we come out of maintenance mode.
  }

  // Trigger any behaviors that the server side code requested to be triggered.
  ThemeBuilder.triggerBehaviors(data);
};

/**
 * Triggers behaviors that the server side code requested to be triggered.
 *
 * @param {Array} data
 *   The data returned from the server, either on application initialization or
 *   on application update.
 */
ThemeBuilder.triggerBehaviors = function (data) {
  if (data.hasOwnProperty("behaviors_to_trigger")) {
    for (var behavior_to_trigger in data.behaviors_to_trigger) {
      if (data.behaviors_to_trigger.hasOwnProperty(behavior_to_trigger)) {
        jQuery('#themebuilder-main').trigger(behavior_to_trigger);
      }
    }
  }
};

/**
 * Work around an issue in Drupal's behavior code that causes the attach method to not be called if a previously called attach method encountered an error.
 *
 * Because of a lack of exception handling in behaviors code, it is
 * not guaranteed that all of the behaviors code will actually get
 * executed.  See http://drupal.org/node/990880.
 * Until that issue is resolved, wrap each behavior attach method with
 * a wrapper that catches and ignores any error.
 */
ThemeBuilder.protectAgainstBrokenInitializers = function () {
  for (var behavior in Drupal.behaviors) {
    if (jQuery.isFunction(Drupal.behaviors[behavior].attach)) {
      var attach = Drupal.behaviors[behavior].attach;
      Drupal.behaviors[behavior].attach = ThemeBuilder.errorCatchingWrapper(behavior, attach);
    }
  }
};

/**
 * This wrapper is used to wrap each behavior's attach method to prevent errors encountered during initialization from preventing subsequent initialization code from executing.
 *
 * @param {String} behavior
 *   The name of the behaivor the specified attach function is associated with.
 * @param {Function} attach
 *   The attach method that is to be wrapped with error handling functionality.
 */
ThemeBuilder.errorCatchingWrapper = function (behavior, attach) {
  return function () {
    try {
      return attach.apply(this, arguments);
    }
    catch (e) {
      var message = e.message ? e.message : e;
      ThemeBuilder.Log.gardensWarning('AN-25177 - Error encountered in the JavaScript initialization code', 'Drupal.behaviors.' + behavior + ': ' + message);
      if (ThemeBuilder.isDevelMode()) {
        alert(message);
      }
    }
  };
};

/**
 * Make sure that any errors encountered during initialization do not
 * make it impossible to open the themebuilder.
 */
ThemeBuilder.protectAgainstBrokenInitializers();
;
/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
 browser: true */

/*global jQuery: true Drupal: true window: true ThemeBuilder: true */

(function ($) {

  /**
   * Override for the extlink module.
   *
   * ThemeBuilder requires the <a> and <span> tags for external links to have
   * different classes, so they can be targeted separately.
   */
  Drupal.extlink = Drupal.extlink || {};

  Drupal.behaviors.extlink = Drupal.behaviors.extlink || {};

  Drupal.behaviors.extlink.attach = function (context, settings) {
    // Add "-link" to the end of the class name that's applied to both <a> and
    // <span> tags. We will remove it later before applying it to <span> tags.
    if (Drupal.settings.extlink && Drupal.settings.extlink.extClass) {
      Drupal.settings.extlink.extClass = Drupal.settings.extlink.extClass + '-link';
    }
    if ($.isFunction(Drupal.extlink.attach)) {
      Drupal.extlink.attach(context, settings);
    }
  };

  /**
   * Overrides method from the extlink module.
   *
   * Change the class name for the <span> that comes after external links,
   * so that it's "ext", not "ext-link".
   */
  Drupal.extlink.applyClassAndSpan = function (links, class_name) {
    var $links_to_process;
    if (parseFloat($().jquery) < 1.2) {
      $links_to_process = $(links).not('[img]');
    }
    else {
      var links_with_images = $(links).find('img').parents('a');
      $links_to_process = $(links).not(links_with_images);
    }
    $links_to_process.addClass(class_name);
    var i;
    var length = $links_to_process.length;
    // If we've added "-link" to the end of the class name, remove it for
    // <span> tags. We want "-link" only at the end of the link class.
    var span_class = class_name.replace(/-link$/, '');
    for (i = 0; i < length; i++) {
      var $link = $($links_to_process[i]);
      if ($link.css('display') === 'inline') {
        $link.after('<span class=' + span_class + '></span>');
      }
    }
  };

  /**
   * Stop the rotation in the Rotating Banner when the ThemeBuilder is open
   */
  Drupal.behaviors.RotatingBannerInThemeBuilder = {
    attach: function (context) {
      if ($('body').hasClass('themebuilder')) {
        $('.rb-slides').each(function () {
          if ($(this).cycle) {
            $(this).cycle('stop');
          }
        });
      }
    }
  };

  /**
   * Activate Superfish Pulldown menus
   */
  Drupal.behaviors.GardensFeaturesPulldownMenus = {
    attach: function (context, settings) {
      Drupal.behaviors.GardensFeaturesPulldownMenus.settings = {
        appearance: {
          gutter: 10,
          push: 2,
          overlapOffset: 1.4545
        }
      };

      if (settings) {
        $.extend(Drupal.behaviors.GardensFeaturesPulldownMenus.settings, settings);
      }

      if ($().superfish) {
        $('.content > .menu', '#page .stack-navigation').once('pulldown', function () {
          var ghi = Drupal.settings.gardens_hoverintent || {enabled: true, sensitivity: 2, interval: 300, timeout: 500};
          $(this).superfish({
            hoverClass: 'menu-dropdown-hover',
            delay: 150,
            dropShadows: false,
            speed: 300,
            autoArrows: true,
            onBeforeShow: Drupal.behaviors.GardensFeaturesPulldownMenus.adjustPulldown,
            disableHI: !ghi.enabled,
            HISensitivity: ghi.sensitivity,
            HIInterval: ghi.interval,
            HITimeout: ghi.timeout
          });
        }).addClass('pulldown');
      }
    }
  };

  /**
   * This function is run to adjust the placement of a pulldown.
   *
   * @param {DomElement} this
   *   The pulldown (ul) that is currently being shown.
   */
  Drupal.behaviors.GardensFeaturesPulldownMenus.adjustPulldown = function () {
    $(this).css({display: 'block', visibility: 'hidden'});
    Drupal.behaviors.GardensFeaturesPulldownMenus.adjustPulldownPlacement($(this));
    $(this).css({display: 'none', visibility: 'visible'});
  };

  /**
   * Progressively increases the width of the pulldown by 33% until
   * the height of each item is less than the line height
   *
   * @param {DomElement} pulldown
   *   The pulldown (ul) to be positioned
   * @param {DomElement} item
   *   The anchor tag of an item in the list
   * @param {int} lineHeight
   *   The line height of the item's anchor tag. This is passed in
   *   because it does not need to be calculated more than once
   * @param {int} safety
   *   A counter to prevent recursive errors. The width of the pulldown
   *   will be adjusted at most 5 times currently.
   */
  Drupal.behaviors.GardensFeaturesPulldownMenus.adjustPulldownWidth = function (pulldown, item, lineHeight, safety) {
    var width = pulldown.width();
    var height = item.height();
    var wrapped = ((height - lineHeight) > 2) ? true : false; // Provide a little give with a 2 pixel fudge factor for IE7
    if (wrapped && (safety < 5)) {
      pulldown.animate({
          width: width * 1.2
        },
        {
          duration: 0,
          queue: true,
          complete: function () {
            safety += 1;
            Drupal.behaviors.GardensFeaturesPulldownMenus.adjustPulldownWidth(pulldown, item, lineHeight, safety);
          }
        }
      );
    }
  };

  /**
   * Moves a pulldown left or right, according to its alignment, after its
   * parent's width has been adjusted
   *
   * @param {DomElement} pulldown
   *   The pulldown (ul) to be positioned
   */
  Drupal.behaviors.GardensFeaturesPulldownMenus.adjustPulldownPlacement = function (element) {
    var pulldown = {};
    pulldown.el = element;
    var isRTL = ($('html').attr('dir') === 'rtl');

    // Wipe out any previous positioning
    pulldown.el.removeAttr('style');

    // Get the depth of the sub menu
    // 0 is first tier sub menu
    // 1 is second tier sub menu, etc
    var depth = pulldown.el.parentsUntil('.pulldown-processed').filter('.menu').length;
    pulldown.parent = {};
    pulldown.parent.el = element.prev('a');
    pulldown.parent.css = {
      lineHeight: Drupal.behaviors.GardensFeaturesPulldownMenus._stripPX(pulldown.parent.el.css('line-height')),
      padding: {
        top: Drupal.behaviors.GardensFeaturesPulldownMenus._stripPX(pulldown.parent.el.css('padding-top'))
      },
      margin: {
        top: Drupal.behaviors.GardensFeaturesPulldownMenus._stripPX(pulldown.parent.el.css('margin-top'))
      }
    };
    // Only consider pulldowns, not the main menu items
    // Basic placement without edge detection
    var root = {};
    root.el = pulldown.el.parents('.pulldown-processed li .menu');
    if (root.el && (root.el.length > 0)) {
      pulldown.el.css({
        left: root.el.width()
      });
    }
    // Get the viewport and scroll information
    var viewport = {};
    viewport.width = $(window).width(); // Width of the visible viewport
    viewport.height = $(window).height(); // Height of the visible viewport
    viewport.scroll = {};
    viewport.scroll.top = $(window).scrollTop();
    pulldown.pos = pulldown.el.position();
    // pushDir corresponds to the RTL setting
    var pushDir = (isRTL) ? 'right' : 'left';
    // handDir corresponds to which edge of the screen the menus might collide with. It is the opposite
    // of pushDir.
    var hangDir = (pushDir === 'right') ? 'left' : 'right';
    // Move the pulldown back to its origin if we moved it because of edge correction previously
    var prevCorrection = Drupal.behaviors.GardensFeaturesPulldownMenus._stripPX(pulldown.el.css(pushDir));
    if (prevCorrection < 0) {
      pulldown.el.css[pushDir] = pulldown.pos[pushDir] = 0;
    }
    // Now check for edge collision
    pulldown.offset = pulldown.el.offset();
    if (pulldown.offset) {
      pulldown.width = pulldown.el.outerWidth(false);
      pulldown.height = pulldown.el.outerHeight(false);
      pulldown.edge = {};
      pulldown.edge.left = pulldown.offset.left;
      pulldown.edge.right = pulldown.offset.left + pulldown.width;
      pulldown.edge.bottom = pulldown.offset.top + pulldown.height;
      pulldown.hang = {};
      pulldown.hang.left = pulldown.edge.left;
      pulldown.hang.right = viewport.width - pulldown.edge.right;
      pulldown.hang.bottom = (viewport.height + viewport.scroll.top) - pulldown.edge.bottom  - Drupal.behaviors.GardensFeaturesPulldownMenus.settings.appearance.gutter;
      pulldown.hang.bottomModified = 1;
      pulldown.correction = {};
      pulldown.correction.left = pulldown.pos.left + pulldown.hang.right - Drupal.behaviors.GardensFeaturesPulldownMenus.settings.appearance.gutter;
      pulldown.correction.right = (depth > 0) ?
        pulldown.hang.left + pulldown.width - Drupal.behaviors.GardensFeaturesPulldownMenus.settings.appearance.gutter :
        pulldown.hang.left - Drupal.behaviors.GardensFeaturesPulldownMenus.settings.appearance.gutter;

      // Move the pulldown back onto the screen
      if (pulldown.hang[hangDir] <= 0) {
        var leftVal = (pushDir === 'left') ? pulldown.correction.left : 'auto';
        var rightVal = (pushDir === 'right') ? pulldown.correction.right : 'auto';
        pulldown.el.css(
          {
            'left': leftVal,
            'right': rightVal
          }
        );
        // Push the pulldown down half a line height if it is a sub-sub menu so that sub menu items aren't completely occluded.
        if (depth > 0) {
          var top = (((pulldown.parent.css.lineHeight) / Drupal.behaviors.GardensFeaturesPulldownMenus.settings.appearance.overlapOffset) + (pulldown.parent.css.padding.top) + (pulldown.parent.css.margin.top));
          pulldown.el.css('top', top);
          pulldown.hang.bottomModified = pulldown.hang.bottom - top;
        }
      }
      // Move the pulldown up if it hangs off the bottom
      if (pulldown.hang.bottom <= 0 || pulldown.hang.bottomModified <= 0) {
        pulldown.el.css('top', (pulldown.pos.top + pulldown.hang.bottom));
      }
    }
  };

  /**
   * Utility function to remove 'px' from calculated values.  The function assumes that
   * that unit 'value' is pixels.
   *
   * @param {String} value
   *   The String containing the CSS value that includes px.
   * @return {int}
   *   Value stripped of 'px' and casted as a number or NaN if 'px' is not found in the string.
   */
  Drupal.behaviors.GardensFeaturesPulldownMenus._stripPX = function (value) {
    if (value) {
      var index = value.indexOf('px');
      if (index === -1) {
        return NaN;
      }
      else {
        return Number(value.substring(0, index));
      }
    }
    else {
      return NaN;
    }
  };

  /**
   * Add a "Show/Hide disabled views" toggle link to the Views list on
   * admin/structure/views, similar to the "Show/Hide row weights" link on
   * tabledrag tables.
   */
  Drupal.behaviors.GardensFeaturesViewsListFilter = {
    attach: function (context, settings) {
      $('body.page-admin-structure-views table.#ctools-export-ui-list-items').once('gardens-features-views-list-filter', function () {
        var $table = $(this);

        // Remove any prior links created (for when table gets replaced by AJAX)
        $('.gardens-features-toggle-disabled-wrapper').remove();

        // Create the toggle link, initialized to reflect that all rows are
        // currently shown.
        var $link = $('<a href="#" class="gardens-features-toggle-disabled gardens-features-toggle-disabled-show"></a>')
          .text(Drupal.t('Hide disabled views'))
          .click(function () {
            if ($(this).hasClass('gardens-features-toggle-disabled-show')) {
              $(this).removeClass('gardens-features-toggle-disabled-show');
              $(this).addClass('gardens-features-toggle-disabled-hide');
              $('.ctools-export-ui-disabled', $table).hide();
              if ($('tbody tr', $table).length === $('.ctools-export-ui-disabled', $table).length) {
                $('tbody', $table).prepend('<tr class="gardens-features-toggle-disabled-empty odd"><td colspan="5">' + Drupal.t('No enabled views found.') + '</td></tr>');
              }
              $.cookie('Drupal.GardensFeaturesViewsListFilter.showDisabled', 0, {path: Drupal.settings.basePath, expires: 365});
              $(this).text(Drupal.t('Show disabled views'));
            }
            else {
              $(this).removeClass('gardens-features-toggle-disabled-hide');
              $(this).addClass('gardens-features-toggle-disabled-show');
              $('.ctools-export-ui-disabled', $table).show();
              $('.gardens-features-toggle-disabled-empty', $table).remove();
              $.cookie('Drupal.GardensFeaturesViewsListFilter.showDisabled', 1, {path: Drupal.settings.basePath, expires: 365});
              $(this).text(Drupal.t('Hide disabled views'));
            }
            return false;
          });

        // Add it before the table.
        $table.before($link.wrap('<div class="gardens-features-toggle-disabled-wrapper"></div>').parent());

        // Unless there's a cookie for disabled views to be shown, "click" the
        // link in order to hide them.
        if ($.cookie('Drupal.GardensFeaturesViewsListFilter.showDisabled') !== '1') {
          $link.click();
        }

        // If the filter form is also active, remove the widget to filter by
        // enabled/disabled status, to not conflict with the toggle link.
        $('#ctools-export-ui-list-form .form-item-disabled').hide();
      });
    }
  };

  /**
   * Open all links to Drupal Gardens "Learn More" pages in a new window.
   */
  Drupal.behaviors.GardensFeaturesLearnMoreLinks = {
    attach: function (context, settings) {
      $('a[href^="http://www.drupalgardens.com/learnmore/"]', context).attr('target', '_blank');
    }
  };


  /**
   * Scroll to top of AJAX view on pager click.
   */
  Drupal.behaviors.viewsAjaxScroll = {
    attach: function (context, settings) {
      if (typeof Drupal.settings.views !== 'undefined' &&
          typeof Drupal.settings.views.ajax_path !== 'undefined' &&
          typeof Drupal.behaviors.ViewsLoadMore === 'undefined') {
        // make sure we have AJAX, but not load_more
        $('.item-list .pager a').not('a.load-more').once('views-ajax-scroll').click(function ()
        {
          var outer = $(this).parents('.view');
          if ($(outer).parents('.pane').length) {
            // if there is surrounding pane, scroll to top of it
            outer = $(outer).parents('.pane');
          }
          else if ($(outer).parents('.block').length) {
            // if there is surrounding block, scroll top top of it
            outer = $(outer).parents('.block');
          }
          var viewtop = outer.offset().top - $('#toolbar').outerHeight();
          $('html, body').animate({scrollTop: viewtop}, 'slow', 'linear');
        });
      }
    }
  };

  /**
   * Add dialog behavior to /user links for anonymous users.
   */
  Drupal.behaviors.gardensUserDialog = {};
  Drupal.behaviors.gardensUserDialog.attach = function (context, settings) {
    var useCapture = settings.janrainCapture && settings.janrainCapture.enforce;
    if (settings.gardensFeatures && settings.gardensFeatures.userIsAnonymous && settings.gardensFeatures.dialogUserEnabled && !useCapture) {
      // Modify all /user links so that they appear in a popup dialog.
      var links = $('a[href^="/user"]').once('user-dialog');
      var length = links.length;
      if (links.length === 0) {
        return;
      }
      var i, link, intab;
      for (i = 0; i < length; i++) {
        link = links[i];
        // Is the link in a tab (e.g. on the user login register or password pages)
        intab = $(link).parents().filter('ul.tabs');
        // Only act on the following types of links:
        // /user, /user/login, /user/register, /user/password
        // Ignore links that were already set up correctly on the server side.
        if (link.href.indexOf('nojs') === -1 && link.href.indexOf('ajax') === -1) {
          if (link.href.match(/\/user$/)) {
            if(intab.length == 0) {
              link.href = '/user/login/ajax';
            }
            else {
              link.href = '/user/login/nojs';
            }
            $(link).addClass('use-ajax use-dialog');
          }
          else if (link.href.match(/\/user\/(login|register|password)$/)) {
            if(intab.length == 0) {
                    link.href = link.href.replace(/\/user\/(login|register|password)/, '/user/$1/ajax');
            }
            else {
              link.href = link.href.replace(/\/user\/(login|register|password)/, '/user/$1/nojs');
            }
            $(link).addClass('use-ajax use-dialog');
          }
        }
      }
      // The AJAX and dialog behaviors have already run; rerun them to pick up
      // newly ajaxified links.
      Drupal.behaviors.AJAX.attach(context, settings);
      Drupal.behaviors.dialog.attach(context, settings);
    }
  };

  // Disable the lazyloader: http://drupal.org/node/665128#comment-5301192
  if (typeof(Drupal.ajax) !== 'undefined') {
    Drupal.ajax.prototype.commands.xlazyloader = function () {};
  }
}(jQuery));
;
