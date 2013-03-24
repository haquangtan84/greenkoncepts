var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var nlogger = require('nlogger').logger(module);
var _ = require('underscore');
var async = require('async');

var tagsCollectionName = 'fbm_tags';

TagsProvider = function(mongoDbInstance) {
  this.db = mongoDbInstance.db;
};

TagsProvider.prototype.getCollection = function(callback) {
  this.db.collection(tagsCollectionName, function(err, res) {
    if (err)
      callback(err);
    else callback(null, res);
  });
};

TagsProvider.prototype.list = function(callback) {
  this.getCollection(function(err, collection) {
    if (err)
      return callback(err);
    else
      collection.find().toArray(callback);
  });
}

TagsProvider.prototype.saveTag = function(tag, callback) {
  this.getCollection(function(error, tags_collection) {
    if (error) {
      callback(error);
    } else {
      tags_collection.insert({name : tag}, function(err, records) {
        callback(err, records);
      });
    }
  });
};

TagsProvider.prototype.getTagById = function(tagId, callback) {
  this.getCollection(function(err, tags_collection) {
    if (err) {
      return callback(err);
    } else {
      return tags_collection.findOne({
        _id : tags_collection.db.bson_serializer.ObjectID.createFromHexString(tagId)
      }, callback);
    }
  });
};

exports.TagsProvider = TagsProvider;
