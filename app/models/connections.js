var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var nlogger = require('nlogger').logger(module);
var _ = require('underscore');
var async = require('async');

var connectionCollectionName = 'fbm_connections';

ConnectionProvider = function(mongoDbInstance) {
  this.db = mongoDbInstance.db;
};

ConnectionProvider.prototype.getCollection = function(callback) {
  this.db.collection(connectionCollectionName, function(err, res) {
    if (err)
      callback(err);
    else callback(null, res);
  });
};

ConnectionProvider.prototype.findConnectionStatus = function(connFrom, connTo,
    callback) {
  this.getCollection(function(err, conn_collection) {
    if (err) {
      callback(err);
    } else {
      conn_collection.findOne({
        conn_from : connFrom._id,
        conn_to : connTo._id
      }, callback);
    }
  });
};

ConnectionProvider.prototype.getFriendshipStatusWith2Friends = function(user, frnd1, frnd2, callback) {
  var self = this;
  async.waterfall([
    function checkConnectionWithFrnd1(w_callback) {
      self.getFriendshipStatus({_id: user}, {_id: frnd1}, function(err, status) {
        if (err) return w_callback(err);

        w_callback(null, {friend1: status});
      });
    },
    function checkConnectionWithFrnd2(result, w_callback) {
      self.getFriendshipStatus({_id: user}, {_id: frnd2}, function(err, status) {
        if (err) return w_callback(err);

        result.friend2 = status;
        w_callback(null, result);
      });
    }
  ], function w_result(err, resultStatus) {
    callback(err, resultStatus);
  });
}

ConnectionProvider.prototype.getFriendshipStatus = function(conn1, conn2,
    callback) {
  var self = this;
  async.waterfall([

  function checkCon1Con2Status(w_callback) {
    self.findConnectionStatus(conn1, conn2, function(err, result) {
      if (err) return w_callback(err);

      if (result && !_.isUndefined(result._id)) {
        w_callback(null, true);
      } else w_callback(null, false);

    });
  },

  function checkCon2Con1Status(result, w_callback) {
    if (result) {

      self.findConnectionStatus(conn2, conn1, function(err, result) {
        if (err) return w_callback(err);

        if (result && !_.isUndefined(result._id)) {
          w_callback(null, true);
        } else w_callback(null, false);

      });
    } else {
      w_callback(null, false);
    }

  } ], function w_result(err, friendshipStatus) {

    if (err) nlogger.error(err);

    callback(err, friendshipStatus);
  });

};

ConnectionProvider.prototype.addConnection = function(connFrom, connTo,
    callback) {

  var self = this;

  // first check if the connection is already added or not
  this.findConnectionStatus(connFrom, connTo, function(err, result) {
    if (result && !_.isUndefined(result._id)) {
      return callback(null, result);
    } else {

      var connDoc = {
        conn_from : connFrom._id,
        conn_to : connTo._id,
        created_at : new Date()
      };

      self.getCollection(function(err, conn_collection) {
        if (err) {
          return callback(err);
        } else {
          return conn_collection.insert(connDoc, callback);
        }
      });
    }
  });
};

ConnectionProvider.prototype.getConnectionsForUser = function(connFrom,
    callback) {

  this.getCollection(function(err, conn_collection) {
    if (err) {
      callback(err);
    } else {
      conn_collection.find({
        conn_from : connFrom._id
      }, [ "conn_to" ]).toArray(callback);
    }
  });

};

exports.ConnectionProvider = ConnectionProvider;
