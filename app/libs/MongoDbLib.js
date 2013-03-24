/**
 * 
 */

var Db = require('mongodb').Db;
var nlogger = require('nlogger').logger(module);

var MongoDbLib = function(options) {
  this.options = options || {};
  this.db = null;
};

MongoDbLib.prototype.conn = function(callback) {
  var self = this;
  new Db.connect(this.options['mongoUri'], function(err, db) {
    if (err)
      nlogger.error(err);
    else self.db = db;
    callback(err, db);
  });
};

MongoDbLib.prototype.close = function(callback) {
  if (this.db != null) {
    this.db.close(function(error, res) {
      error = error || null;
      if (error) nlogger.error(error);
      callback(error, res);
    });
  } else {
    callback(new Error('Db has not been initialized!'));
  }
};
module.exports = MongoDbLib;
