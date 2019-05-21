class Storage {
  static create(values, defaults) {
    const store = new Storage();
    for (const key of Object.keys(values)) {
      store.setIfNull(values[key], defaults[key]);
    }
    return store;
  }

  set(key, val, cb) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      const msg =
        'Octotree cannot save its settings. ' +
        'If the local storage for this domain is full, please clean it up and try again.';
      console.error(msg, e);
    }
    if (cb) cb();
  }

  get(key, cb) {
    var val = parse(localStorage.getItem(key));
    if (cb) cb(val);
    else return val;

    function parse(val) {
      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    }
  }

  setIfNull(key, val, cb) {
    this.get(key, (existingVal) => {
      this.set(key, existingVal == null ? val : existingVal, cb);
    });
  }
}

// overwrite Storage's set and get when the key ends with '.shared'
(() => {
  const oldSet = Storage.prototype.set;
  Storage.prototype.set = function (key, val, cb) {
    // console.log("in storage call set, key is:" + key, "|value is:" + val);
    this._cache = this._cache || {};
    this._cache[key] = val;

    const shared = ~key.indexOf('.shared');
    if (shared) chrome.storage.local.set({[key]: val}, cb || Function());
    else oldSet.call(this, key, val, cb);
  };

  const oldGet = Storage.prototype.get;
  Storage.prototype.get = function (key, cb) {
    // console.log("in storage call get, key is:" + key);
    this._cache = this._cache || {};
    if (!cb) return this._cache[key];

    const shared = ~key.indexOf('.shared');
    if (shared) chrome.storage.local.get(key, (item) => cb(item[key]));
    else oldGet.call(this, key, cb);
  };
})();

const store = Storage.create(STORE, DEFAULTS);
window.store = store;
