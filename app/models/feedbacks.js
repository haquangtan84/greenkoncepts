var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var nlogger = require("nlogger").logger(module);
var _ = require('underscore');

var feedbackCollectionName = 'fbm_feedbacks';

FeedbackProvider = function(mongoDbInstance) {
  this.db = mongoDbInstance.db;
};

FeedbackProvider.prototype.getCollection = function(callback) {
  this.db.collection(feedbackCollectionName, function(error, res) {
    if (error)
      callback(error);
    else callback(null, res);
  });
};

FeedbackProvider.prototype.saveFeedback = function(feedback, callback) {
  this.getCollection(function(error, feedback_collection) {
    if (error) {
      callback(error);
    } else {
      feedback_collection.insert(feedback, callback);
    }
  });
};

FeedbackProvider.prototype.getUserReceivedFeedbackList = function(user,
    options, callback) {
  this.getCollection(function(err, feedback_collection) {
    if (err) {
      return callback(err);
    } else {
      var cursor = feedback_collection.find({
        f_to : user._id
      });
      var _n = 20, _m = 0; // TODO add pager support
      cursor.sort({
        created_at : -1
      }).limit(_n).skip(_m).toArray(callback);
    }
  });
};

FeedbackProvider.prototype.getUserSentFeedbackList = function(user, options,
    callback) {
  this.getCollection(function(err, feedback_collection) {
    if (err) {
      return callback(err);
    } else {
      var cursor = feedback_collection.find({
        f_from : user._id
      });
      
      var _n = 20, _m = 0; // TODO add pager support
      cursor.sort({
        created_at : -1
      }).limit(_n).skip(_m).toArray(callback);
    }
  });
};

FeedbackProvider.prototype.getFeedback = function(feedbackId, callback) {
  this.getCollection(function(err, feedback_collection) {
    if (err) {
      return callback(err);
    } else {
      return feedback_collection.findOne({
        _id : feedback_collection.db.bson_serializer.ObjectID
            .createFromHexString(feedbackId)
      }, callback);
    }
  });
};

exports.FeedbackProvider = FeedbackProvider;
