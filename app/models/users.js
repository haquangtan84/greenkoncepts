var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var nlogger = require('nlogger').logger(module);
var _ = require('underscore');
var async = require('async');

var userCollectionName = 'fbm_users';

UserProvider = function(mongoDbInstance) {
  this.db = mongoDbInstance.db;
};

UserProvider.prototype.getCollection = function(callback) {
  this.db.collection(userCollectionName, function(err, res) {
    if (err)
      callback(err);
    else callback(null, res);
  });
};

UserProvider.prototype.save = function(user_data, callback) {
  this.getCollection(function(err, user_collection) {
    if (err) {
      callback(err);
    } else {
      user_data.created_at = user_data.updated_at = new Date();
      user_data.isShadowUser = false;

      if (!_.isUndefined(user_data.email) && !Array.isArray(user_data.emails)) {
        user_data.emails = [ {
          email : user_data.email,
          primary : true,
          verified : false
        } ];
        delete user_data.email;
      }

      user_collection.insert(user_data, callback);
    }
  });
};

UserProvider.prototype.createShadowUser = function(user_data, callback) {
  var self = this;

  var email = user_data.email;
  delete user_data.email;

  this.findByUserId(email, function(err, user) {
    if (_.isEmpty(user)) {
      self.getCollection(function(err, user_collection) {

        if (err) return callback(err);

        user_data.created_at = user_data.updated_at = new Date();
        user_data.isShadowUser = true;
        user_data.emails = [ {
          email : email,
          verified : false,
          primary : true
        } ];

        user_collection.insert(user_data, function(err, res) {
          if (err) {
            return callback(err);
          } else {
            return user_collection.findOne({
              "emails.email" : email
            }, callback);
          }
        });
      });
    } else {
      return callback(null, user);
    }
  });

};

UserProvider.prototype.createShadowUserWithLinkedInId = function(linkedInId,
    callback) {
  var self = this;
  var user_data = {};

  this.findByLinkedInId(linkedInId, function(err, user) {
    if (_.isEmpty(user)) {
      self.getCollection(function(err, user_collection) {
        if (err) return callback(err);

        user_data.created_at = user_data.updated_at = new Date();
        user_data.isShadowUser = true;
        user_data.linkedInId = linkedInId;

        user_collection.insert(user_data, function(err, res) {
          if (err) {
            return callback(err);
          } else {
            return user_collection.findOne({
              "linkedInId" : linkedInId
            }, callback);
          }
        });
      });
    } else {
      return callback(null, user);
    }
  });
};

UserProvider.prototype.update = function(user_data, callback) {
  this.getCollection(function(err, user_collection) {
    if (err) {
      callback(err);
    } else {
      user_data.updated_at = new Date();
      var _id = String(user_data._id);
      delete user_data._id;
      user_collection.update({
        _id : user_collection.db.bson_serializer.ObjectID
            .createFromHexString(_id)
      }, {
        $set : user_data
      }, {
        safe : true
      }, callback);
    }
  });
};

UserProvider.prototype.findById = function(id, callback) {
  this.getCollection(function(err, user_collection) {
    if (err) {
      callback(err);
    } else {
      console.log(">>> UserProvider.prototype.findById: ", id);
      user_collection.findOne({
        _id : user_collection.db.bson_serializer.ObjectID
            .createFromHexString(id.toString())
      }, callback);
    }
  });
};

UserProvider.prototype.findByUserId = function(email, callback) {
  this.getCollection(function(err, user_collection) {
    if (err) {
      callback(err);
    } else {
      user_collection.findOne({
        "emails.email" : email
      }, callback);
    }
  });
};

UserProvider.prototype.findByLinkedInId = function(linkedInId, callback) {
  this.getCollection(function(err, user_collection) {
    if (err) {
      callback(err);
    } else {
      console.log(">>> UserProvider.prototype.findByLinkedInId: ", linkedInId);
      user_collection.findOne({
        linkedInId : linkedInId
      }, callback);
    }
  });
};

UserProvider.prototype.findAll = function(callback) {
  this.getCollection(function(err, user_collection) {
    if (err) {
      callback(err);
    } else {
      user_collection.find({
        isShadowUser : {
          $ne : true
        }
      }).toArray(function(err, results) {
        if (err) {
          callback(err);
        } else {
          // We remove the password
          for ( var k in results) {
            delete results[k].salt;
            delete results[k].hash;
          }
          callback(null, results);
        }
      });
    }
  });
};

// TODO : a part of this should be move to an "User"
// class which should represent the model.
// And this file should only contain basic CRUD operations.
UserProvider.prototype.addTagToUser = function(id, newTag, callback) {
    var _userProviderRef = this;
    this.findById(id, function(err, user) {
    if (err) {
        callback(err);
    } else {
        if (!user.hasOwnProperty("tags") ||  user.tags == null) {
            user.tags = [];
        }

        for ( var i = 0; i < user.tags.length; i++) {
            var _tag = user.tags[i];
            if (_tag.name != newTag) {
                user.tags.push({
                    name: newTag
                });
            }
        }
        _userProviderRef.getCollection(function(err, user_collection) {
            user_collection.update({
                _id: user_collection.db.bson_serializer.ObjectID.createFromHexString(String(id))
            }, {
                $set: {
                    tags : user.tags
                }
            }, function(err, result) {
                callback(err, result)
            });
        });
    }
  });
}

UserProvider.prototype.addTagsToUser = function(id, tags, callback) {
    var _userProviderRef = this; // TODO : dirty :(
        var i = 0;
    async.whilst(
      function() {
          return i < tags.length;
      },
      function (callback) {
          i++;
          _userProviderRef.addTagToUser(id, tags[i], callback);   
      },
      function (err) {
          callback(err);
      }
    );    

  // this.findById(id, function(err, user) {
  //   if (err) {
  //     callback(err);
  //   } else {
  //     if (!user.hasOwnProperty('tags_list') || user.tags_list === null) {
  //       user.tags_list = new Array();
  //     }
  //     for ( var i = 0; i < user.tags_list.length; i++) {
  //       var s = user.tags_list[i];
  //       if (s.name == skill) {
  //         callback([ "User already has this skill" ]);
  //         return;
  //       }
  //     }
  //     user.tags_list.push({
  //       name : skill
  //     });
  //     _userProviderRef.getCollection(function(err, user_collection) {
  //       user_collection.update({
  //         _id : user_collection.db.bson_serializer.ObjectID
  //             .createFromHexString(String(id))
  //       }, {
  //         $set : {
  //           tags_list : user.tags_list
  //         }
  //       }, function(err, result) {
  //         callback(err, result);
  //       });
  //     });
  //   }
  // });
};

UserProvider.prototype.addEmail = function(user_data, newEmail, callback) {
  var self = this;

  /**
   * We must check whether the email is already registered by anyone before
   */
  async.series([

      function checkWhetherEmailAlreadyRegistered(s_callback) {

        self.findByUserId(newEmail, function(err, user) {

          if (err) return s_callback(err);

          if (user && !_.isUndefined(user._id)) {
            s_callback('Another user has already registered this email');
            return;
          } else s_callback(null);
        });

      },
      // insert new email Id
      function insertNewEmail(s_callback) {
        nlogger.debug('Inserting New Email');

        self.getCollection(function(err, user_collection) {
          if (err) {
            callback(err);
          } else {
            user_collection.update({
              _id : user_collection.db.bson_serializer.ObjectID
                  .createFromHexString(String(user_data._id))
            }, {
              '$push' : {
                emails : {
                  email : newEmail,
                  verified : false
                }
              }
            }, {
              safe : true
            }, s_callback);
          }
        });
      }

  ], function s_result(err, result) {
    // nlogger.debug(arguments);
    if (err) nlogger.error(err);
    callback(err, result);
  });

};

exports.UserProvider = UserProvider;
