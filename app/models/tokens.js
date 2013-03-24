var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var nlogger = require('nlogger').logger(module);
var _ = require('underscore');
var async = require('async');

var tokenCollectionName = 'fbm_tokens';

TokenProvider = function(mongoDbInstance) {
  this.db = mongoDbInstance.db;
};

TokenProvider.prototype.getCollection = function(callback) {
  this.db.collection(tokenCollectionName, function(err, res) {
    if (err)
      callback(err);
    else callback(null, res);
  });
};

TokenProvider.prototype.findTokenById = function(tokenId, callback) {
  this.getCollection(function(err, token_collection) {
    if (err) {
      callback(err);
    } else {
      token_collection.findOne({
        _id : token_collection.db.bson_serializer.ObjectID
            .createFromHexString(tokenId)
      }, callback);
    }
  });
};

TokenProvider.prototype.saveToken = function(tokenData, callback) {
  this.getCollection(function(err, token_collection) {
    if (err) {
      callback(err);
    } else {
      var _token = _.clone(tokenData);
      _token.created_at = _token.updated_at = new Date();
      _token.valid = true;

      token_collection.insert(_token, callback);
    }
  });
};

TokenProvider.prototype.update = function(tokenData, callback) {
  this.getCollection(function(err, token_collection) {
    if (err) {
      callback(err);
    } else {
      var _token = _.clone(tokenData);
      _token.updated_at = new Date();
      var _id = String(_token._id);
      delete _token._id;
      token_collection.update({
        _id : token_collection.db.bson_serializer.ObjectID
            .createFromHexString(_id)
      }, {
        $set : _token
      }, {
        safe : true
      }, callback);
    }
  });
};

TokenProvider.prototype.createTokenData = function(type, data) {
  return {
    type : type,
    data : data
  };
};

exports.TokenProvider = TokenProvider;
