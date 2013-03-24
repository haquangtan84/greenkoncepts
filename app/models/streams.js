var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var nlogger = require('nlogger').logger(module);
var _ = require('underscore');
var async = require('async');

var streamCollectionName = 'fbm_streams';

StreamProvider = function(mongoDbInstance) {
  this.db = mongoDbInstance.db;
};

StreamProvider.prototype.getCollection = function(callback) {
  this.db.collection(streamCollectionName, function(err, res) {
    if (err)
      callback(err);
    else callback(null, res);
  });
};

StreamProvider.prototype.getStreamForUser = function(userId, options, callback) {
  this.getCollection(function(err, stream_collection) {
    if (err) {
      callback(err);
    } else {

      if (typeof options == 'function') {
        callback = options;
        options = {};
      }

      options = parseFindOptions(options);

      var sliceOptions = [ -options.skip, options.limit ];
      nlogger.debug(sliceOptions);

      stream_collection.find({
        "userId" : userId
      }, {
        'fields' : {
          "stream" : {
            "$slice" : sliceOptions
          }
        }
      }).toArray(callback);
    }
  });
};

StreamProvider.prototype.insertActivity = function(connections, streamObj,
    callback) {
  this.getCollection(function(err, stream_collection) {
    if (err) {
      callback(err);
    } else {

      async.forEach(connections, function(conn, fe_callback) {

        stream_collection.update({
          "userId" : conn
        }, {
          "$push" : {
            "stream" : streamObj
          }
        }, {
          "safe" : true,
          "upsert" : true
        }, fe_callback);

      }, function fe_result(err, results) {
        nlogger.debug(results);
        callback(err);
      });

    }
  });
};

// StreamProvider.prototype.update = function(tokenData, callback) {
// this.getCollection(function(err, stream_collection) {
// if (err) {
// callback(err);
// } else {
// var _token = _.clone(tokenData);
// _token.updated_at = new Date();
// var _id = String(_token._id);
// delete _token._id;
// stream_collection.update({
// _id : stream_collection.db.bson_serializer.ObjectID
// .createFromHexString(_id)
// }, {
// $set : _token
// }, {
// safe : true,
// upsert : true
// }, callback);
// }
// });
// };

StreamProvider.prototype.createStreamData = function(subjectId, objectId,
    actionType, actionDate, actionId) {

  // validation starts
  if (arguments.length != 5) { throw new Error(
      'Bad amount of arguments. Received ' + arguments.length + ' arguments'); }

  var err = [];

  if (!_.isString(subjectId) && !_.isObject(subjectId)) {
    err.push('subjectId');
  }
  if (!_.isString(objectId) && !_.isObject(objectId)) {
    err.push('objectId');
  }
  if (!_.isString(actionType)) {
    err.push('actionType');
  }
  // if (!Date.prototype.isPrototypeOf(actionDate)) {
  // err.push('actionDate');
  // }
  if (!_.isDate(actionDate)) {
    err.push('actionDate');
  }
  if (!_.isString(actionId) && !_.isObject(actionId)) {
    err.push('actionId');
  }

  if (err.length > 0) { throw new Error('Bad arguments : [' + err.join(', ')
      + '] '); }
  // validation ends

  // sanitize starts
  if (!_.isString(subjectId)) {
    subjectId = String(subjectId.valueOf());
  }

  if (!_.isString(objectId)) {
    objectId = String(objectId.valueOf());
  }

  if (!_.isString(actionId)) {
    actionId = String(actionId.valueOf());
  }
  // sanitize ends

  return {
    "subjectId" : subjectId,
    "objectId" : objectId,
    "actionType" : actionType,
    "actionDate" : actionDate,
    "actionId" : actionId
  };

};

var parseFindOptions = function(options) {

  // sanitize options
  options.skip = parseInt(options.skip);
  if (_.isNaN(options.skip)) options.skip = 0;

  options.limit = parseInt(options.limit);
  if (_.isNaN(options.limit) || options.limit <= 0) options.limit = 10;

  return options;
};

exports.StreamProvider = StreamProvider;
