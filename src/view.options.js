class OptionsView {
  constructor($dom, store, adapter) {
    this.store = store;
    this.adapter = adapter;
    this.$toggler = $dom.find('.octotree-settings').click(this.toggle.bind(this));
    this.$view = $dom.find('.octotree-settings-view').submit((event) => {
      event.preventDefault();
      this.toggle(false);
    });
    this.$view.find('a.octotree-create-token').attr('href', this.adapter.getCreateTokenUrl());

    this.loadElements();

    // Hide options view when sidebar is hidden
    $(document).on(EVENT.TOGGLE, (event, visible) => {
      if (!visible) this.toggle(false);
    });
  }

  /**
   * Load elements with [data-store] attributes. Invoke this if there are dynamically
   * added elements, so that they can be loaded and saved.
   */
  loadElements() {
    this.elements = this.$view.find('[data-store]').toArray();
  }

  /**
   * Toggles the visibility of this screen.
   */
  toggle(visibility) {
    if (visibility !== undefined) {
      if (this.$view.hasClass('current') === visibility) return;
      return this.toggle();
    }

    if (this.$toggler.hasClass('selected')) {
      this._save();
      this.$toggler.removeClass('selected');
      $(this).trigger(EVENT.VIEW_CLOSE);
    } else {
      this._load();
    }
  }

  _load() {
    this._eachOption(
      ($elm, key, value, cb) => {
        if ($elm.is(':checkbox')) $elm.prop('checked', value);
        else $elm.val(value);
        cb();
      },
      () => {
        this.$toggler.addClass('selected');
        $(this).trigger(EVENT.VIEW_READY);
      }
    );
  }

  _save() {
    /*
     * Certainly not a good place to put this logic but Chrome requires
     * permissions to be requested only in response of user input. So...
     */
    // @ifdef SUPPORT_GHE
    const $ta = this.$view.find('[data-store$=EURLS]').filter(':visible');
    if ($ta.length > 0) {
      const storeKey = $ta.data('store');
      const urls = $ta
        .val()
        .split(/\n/)
        .filter((url) => url !== '');
      // console.log("in options.js the link is:" + urls);
      if (urls.length > 0) {
        chrome.runtime.sendMessage({type: 'requestPermissions', urls: urls}, (granted) => {
          if (!granted) {
            // Permissions not granted (by user or error), reset value
            $ta.val(this.store.get(STORE[storeKey]));
          }
          this._saveOptions();
        });
        return;
      }
    }
    // @endif
    return this._saveOptions();
  }

  _saveOptions() {
    const changes = {};
    this._eachOption(
      ($elm, key, value, cb) => {
        const newValue = $elm.is(':checkbox') ? $elm.is(':checked') : $elm.val();
        if (value === newValue) return cb();
        changes[key] = [value, newValue];
        this.store.set(key, newValue, cb);
      },
      () => {
        if (Object.keys(changes).length) {
          $(this).trigger(EVENT.OPTS_CHANGE, changes);
        }
      }
    );
  }

  _eachOption(processFn, completeFn) {
    parallel(
      this.elements,
      (elm, cb) => {
        const $elm = $(elm);
        const key = STORE[$elm.data('store')];

        this.store.get(key, (value) => {
          processFn($elm, key, value, () => cb());
        });
      },
      completeFn
    );
  }
}
