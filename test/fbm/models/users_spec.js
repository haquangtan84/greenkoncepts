/**
 * 
 */
var nlogger = require('nlogger').logger(module);
var bcrypt = require("bcrypt");
var fbm = require('../../../app/');
var async = require('async');
var _ = require('underscore');

/**
 * util function
 */
var util = {
  randStr : function(length) {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
    for ( var i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
  }
};

var mongoDbInstance = new fbm.libs.MongoDbLib({
  "mongoUri" : fbm.config.mongoUri
});

var UserProvider = fbm.models.users.UserProvider;

describe(
    'UserProvider',
    function() {
      var user = {
        "firstName" : util.randStr(10),
        "lastName" : util.randStr(8),
        "emails" : [ {
          email : util.randStr(6) + "@" + util.randStr(8) + ".com"
        } ],
        "password" : util.randStr(8),
      };
      var userProvider = null;

      it('should first get the mongoDbInstance running', function(done) {
        mongoDbInstance.conn(function(err, db) {
          if (err) {
            nlogger.error('MongoDb is Screwed');
          } else {
            userProvider = new UserProvider(mongoDbInstance);
          }
          done();
        });
      });

      it('findAll should give a list of users', function(done) {
        userProvider.findAll(function(err, result) {
          expect(result.length).toBeGreaterThan(0);
          done();
        });
      });

      it('save should register a new user', function(done) {
        var password = user.password;
        delete user.password; // Don't store password
        user.salt = bcrypt.genSaltSync(10);
        user.hash = bcrypt.hashSync(password, user.salt);

        userProvider.save(user, function(err, data) {
          expect(err).toEqual(null);
          done();
        });
      });

      it('findByUserId should return the new registered user', function(done) {
        var email = user.emails[0].email;
        userProvider.findByUserId(email, function(err, res) {
          expect(res.emails).toEqual(user.emails);
          expect(res.lastName).toEqual(user.lastName);
          expect(res.firstName).toEqual(user.firstName);
          expect(res.created_at).toEqual(res.updated_at);

          // replace the user with the new one
          user = res;
          done();
        });
      });

      it(
          'update should update the previous values and update the created_at to new date',
          function(done) {

            var new_email = util.randStr(6) + "@" + util.randStr(8) + ".com";
            async.waterfall([

            function asyncFindUserById(callback) {
              var email = user.emails[0].email;
              userProvider.findByUserId(email, function(err, result) {
                expect(result).toEqual(user);
                callback(null, result);
              });
            },

            function asyncUpdate(tempUserData, callback) {
              tempUserData.emails[0].email = new_email;
              userProvider.update(tempUserData, function(err, result) {
                if (err) {
                  callback(err);
                } else {
                  callback(null, tempUserData);
                }
              });
            },

            function asyncFindUserByIdToConfirm(tempUserData, callback) {
              userProvider.findByUserId(new_email, function(err, result) {
                expect(result.lastName).toEqual(user.lastName);
                expect(result.emails).not.toEqual(user.emails);
                expect(result.emails).toEqual(tempUserData.emails);
                expect(result.firstName).toEqual(user.firstName);
                expect(result.created_at).toEqual(user.created_at);
                expect(result.updated_at).not.toEqual(user.created_at);
                expect(result.updated_at).toBeGreaterThan(user.created_at);
                callback(null, result);
              });
            } ],

            function(err, results) {
              done();
            });
          });

      it('should create a shadow user if the email doesn\'t exist', function(
          done) {
        var email = util.randStr(6) + "@" + util.randStr(8) + ".com";

        async.series([
        // create shadow user
        function createShadowUser(s_callback) {
          userProvider.createShadowUser({
            email : email
          }, function(err, res) {
            expect(res.emails[0].email).toEqual(email);
            expect(res.emails[0].verified).toEqual(false);
            s_callback(err);
          });
        } ], function s_result(err) {
          expect(err).toBe(null);
          done();
        });

      });

      it('should return a shadow user if the email already existed', function(
          done) {
        var email = util.randStr(6) + "@" + util.randStr(8) + ".com";
        var shadowUser = {};

        async.series([

        // create shadow user
        function createShadowUser(s_callback) {
          userProvider.createShadowUser({
            email : email
          }, function(err, res) {
            expect(err).toBe(null);
            shadowUser = res;
            s_callback(err);
          });
        },

        function retrieveShadowUserUponDuplicateCall(s_callback) {
          userProvider.createShadowUser({
            email : email
          }, function(err, res) {
            expect(res).toEqual(shadowUser);
            s_callback(err);
          });
        } ], function w_result(err) {
          expect(err).toBe(null);
          done();
        });
      });

      it('should add an email to the user\'s account', function(done) {
        var new_email = util.randStr(6) + "@" + util.randStr(8) + ".com";

        async.series([

        function addEmail(s_callback) {
          userProvider.addEmail(user, new_email, function(err, res) {
            expect(err).toBe(null);
            s_callback(err);
          });
        },

        function retrieveUserByNewEmail(s_callback) {
          userProvider.findByUserId(new_email, function(err, result) {
            expect(result._id).toEqual(user._id);
            expect(result.emails.length).toBeGreaterThan(1);
            s_callback(err);
          });
        },

        function sameEmailCannotBeAddedAgain(s_callback) {
          userProvider.addEmail(user, new_email, function(err, res) {
            expect(err).not.toBe(null);
            s_callback(null);
          });
        } ], function w_result(err) {
          expect(err).toBe(null);
          done();
        });
      });

      it('should end the mongoDbInstance', function(done) {
        mongoDbInstance.close(function(err) {
          done();
        });
      });

    });
