import Ember from 'ember';
import Model from 'ember-data/model';
import Tracker from './tracker';

Model.reopen({

  /**
   * Did an attribute/association change?
   *
   * @param {String} key the attribute/association name
   * @param {Object} changed optional ember-data changedAttribute object
   * @returns {Boolean} true if value changed
   */
  didChange(key, changed, options) {
    return Tracker.didChange(this, key, changed, options);
  },

  /**
   * Did any attribute/association change?
   *
   * returns object with:
   *  {key: value} = {attribute: true}
   *
   * If the the attribute changed, it will be included in this object
   *
   * @returns {*}
   */
  changed() {
    let changed = Object.assign({}, this.changedAttributes());
    let trackerInfo = Tracker.metaInfo(this);
    for (let key in trackerInfo) {
      if (!changed[key] && trackerInfo.hasOwnProperty(key)) {
        if (this.didChange(key, changed)) {
          changed[key] = true;
        }
      }
    }
    return changed;
  },

  /**
   * Rollback all the changes on this model, for the keys you are
   * tracking.
   *
   * NOTE: Be sure you understand what keys you are tracking.
   * By default, tracker will save all keys, but if you set up
   * a model to 'only' track a limited set of keys, then the rollback
   * will only be limited to those keys
   *
   */
  rollback() {
    let trackerInfo = Tracker.metaInfo(this);
    this.rollbackAttributes();
    let data = { id: this.id };
    Object.keys(trackerInfo).forEach((key) => {
      if (this.didChange(key, null, trackerInfo)) {
        // For now, blow away the hasMany relationship before resetting it
        // since pushing is not clearing and resetting at the moment
        // this slows down the hasMany rollback by about 25%, but still
        // fast => (~100ms) with 500 items in a hasMany
        if (trackerInfo[key].type === 'hasMany') {
          this.set(key, []);
        }
        data[key] = Tracker.lastValue(this, key);
      }
    });
    let normalized = Tracker.normalize(this, data);
    this.store.push(normalized);
  },

  // alias for saveChanges method
  startTrack() {
    this.saveChanges();
  },

  /**
   * Save the current state of the model
   *
   * NOTE: This is needed when manually pushing data
   * to the store and using Ember < 2.10
   */
  saveChanges() {
    Tracker.setupTracking(this);
    Tracker.saveChanges(this);
  },

  /**
   * Get value of the last known value tracker is saving for this key
   *
   * @param {String} key attribute/association name
   * @returns {*}
   */
  savedTrackerValue(key) {
    return Tracker.lastValue(this, key);
  },

  // save state when model is loaded or created if using auto save
  setupTrackerMetaData: Ember.on('ready', function() {
    if (Tracker.isIsDirtyEnabled(this)) {
      Tracker.initializeDirtiness(this);
    }
    if (Tracker.isAutoSaveEnabled(this)) {
      Tracker.setupTracking(this);
      this.saveChanges();
    }
  }),

  // when model updates, update the tracked state if using auto save
  saveOnUpdate: Ember.on('didUpdate', function() {
    if (Tracker.isAutoSaveEnabled(this)) {
      this.saveChanges();
    }
  }),

  // There is no didReload callback on models, so have to override reload
  reload() {
    let promise = this._super();
    promise.then(() => {
      if (Tracker.isAutoSaveEnabled(this)) {
        this.saveChanges();
      }
    });
    return promise;
  },

  // when model deletes, remove any tracked state
  clearSavedAttributes: Ember.on('didDelete', function() {
    Tracker.clear(this);
  })

});
