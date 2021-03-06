import Ember from 'ember';

export const modelTransform = function(model, polymorphic) {
  if (polymorphic) {
    return { id: model.id, type: model.constructor.modelName };
  }
  return model.id;
};

export const relationShipTransform = {
  belongsTo: {
    serialize(model, key, options) {
      let value = model.belongsTo(key).value();
      return value && modelTransform(value, options.polymorphic);
    },

    deserialize() {
    }
  },
  hasMany: {
    serialize(model, key, options) {
      let value = model.hasMany(key).value();
      return value && value.map((item) => modelTransform(item, options.polymorphic));
    },

    deserialize() {
    }
  }
};

export const isEmpty = function(value) {
  if (Ember.typeOf(value) === 'object') {
    return Ember.$.isEmptyObject(value);
  }
  return Ember.isEmpty(value);
};

export const serializedModelChanged = function(one, other) {
  return one.id !== other.id || one.type !== other.type;
};

export const hasManyChanged = function(one, other, polymorphic) {
  if (isEmpty(one) && isEmpty(other)) {
    return false;
  }

  if ((one && one.length) !== (other && other.length)) {
    return true;
  }

  if (polymorphic) {
    one = Ember.A(one).sortBy('id');
    other = Ember.A(other).sortBy('id');
    for (let i = 0, len = one.length; i < len; i++) {
      if (serializedModelChanged(one[i], other[i])) {
        return true;
      }
    }
    return false;
  }

  one.sort();
  other.sort();
  for (let i = 0, len = one.length; i < len; i++) {
    if (one[i] !== other[i]) {
      return true;
    }
  }
};

export const valuesChanged = function(one, other, polymorphic) {
  if (isEmpty(one) && isEmpty(other)) {
    return false;
  }

  if (!one && other || one && !other) {
    return true;
  }
  if (polymorphic) {
    return serializedModelChanged(one, other);
  }
  return one !== other;
};
