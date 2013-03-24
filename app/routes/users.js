var bcrypt = require('bcrypt');
var Models = require('../models');
var UserProvider = Models.users.UserProvider;
var FeedbackProvider = Models.feedbacks.FeedbackProvider;
var ConnectionProvider = Models.connections.ConnectionProvider;
var TokenProvider = Models.tokens.TokenProvider;

var async = require('async');
var _ = require('underscore');
var nlogger = require('nlogger').logger(module);
var mailService = require('../services/mailService');
var socialService = require('../services/socialService');

var route_users = {};
route_users.list = function(req, res, options) {
  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));

  async.waterfall([
  // get users list
  function getUsersList(w_callback) {
    userProvider.findAll(w_callback);
  }

  ], function w_result(err, result) {
    req.app.get('responseHandler')(err, result, res);
  });
};

var validate_registration = function(req) {
  var r = {
    status : true
  };

  if (!('user' in req.body)) {
    r.status = false;
    r.message = 'No user';
    return r;
  }

  var user = req.body.user;
  if (!('email' in user) || user.email == '') {
    r.status = false;
    r.message = 'No email provided';
    return r;
  }

  return r;
};

route_users.register = function(req, res) {
  // TODO : validate
  var r = validate_registration(req);
  if (!r.status) { return res.json(r); }

  var user = req.body.user;
  var email = user.email;
  delete user.email;
  user.emails = [ {
    email : email,
    verified : false,
    primary : true
  } ];

  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));

  async
      .waterfall(
          [
              // confirm if the same user exist or not
              function(w_callback) {
                userProvider
                    .findByUserId(
                        email,
                        function(err, result) {
                          nlogger.debug(arguments);
                          if (result
                              && !(result.isShadowUser && result.isShadowUser == true))
                            return w_callback('A user has already been registered with the same email id');
                          w_callback(null, result);
                        });
              },

              // save the new user
              function(shadow_user, w_callback) {
                nlogger.debug(shadow_user);

                var password = user.password;
                delete user.password; // Don't store password
                user.salt = bcrypt.genSaltSync(10);
                user.hash = bcrypt.hashSync(password, user.salt);

                if (shadow_user) {
                  shadow_user.isShadowUser = false;
                  _.extend(shadow_user, user);
                  nlogger.debug(user);
                  nlogger.debug(shadow_user);
                  return userProvider.update(shadow_user, w_callback);
                } else {
                  return userProvider.save(user, w_callback);
                }
              }

          ],

          function w_result(err, result) {
            if (!err) {
              delete result.hash;
              delete result.salt;
            }
            req.app.get('responseHandler')(err, result, res);
          });
};

route_users.login = function(req, res) {
  if ('user' in req.session) { return res.json({
    status : true,
    errors : [],
    user : req.session.user
  }); }

  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));

  async
      .waterfall(
          [
              // pre validations
              function(w_callback) {
                var err = [];
                var login = req.body.login;
                if (!login) {
                  err.push('Missing login.');
                }
                var password = req.body.password;
                if (!password) {
                  err.push('Missing password.');
                }
                if (err.length > 0) { return w_callback(err); }

                w_callback(null, login, password);
              },

              // get users list
              function(login, password, w_callback) {
                userProvider
                    .findByUserId(
                        login,
                        function(err, user) {
                          var _err = [];
                          if (err || !user) {
                            _err.push('User with login ' + login
                                + ' does not exist.');
                            return w_callback(_err);
                          }

                          if (user.hash == undefined) { // means account was
                            // created with LinkedIn
                            _err
                                .push("Password is not defined. Contact us if you cannot log-in to your account.");
                            return w_callback(_err);
                          } else {
                            bcrypt.compare(password, user.hash, function(err,
                                didSucceed) {
                              if (err || !didSucceed) {
                                _err.push('Wrong password.');
                                return w_callback(_err);
                              }

                              delete user.hash;
                              delete user.salt;
                              req.session.user = user;
                              return w_callback(null, user);
                            });
                          }
                        });
              }

          ], function w_result(err, result) {
            req.app.get('responseHandler')(err, result, res);
          });

};

route_users.find = function(req, res) {
  if (req.params.id === undefined) { return res.json({
    status : false,
    errors : [ 'No user id provided' ]
  }); }

  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));

  async.waterfall([
      // get user by id
      function getUserById(w_callback) {
        userProvider.findById(req.params.id, w_callback);
      },

      function checkGetConnectionStatusParam(user, w_callback) {
        if (req.session.user && req.session.user._id != user._id) {
          if (req.query['getConnectionStatus'] == 1) {
            if (user && !_.isUndefined(user._id)) user._id = String(user._id);
            var connectionProvider = new ConnectionProvider(req.app
                .get('mongoDbInstance'));

            connectionProvider.getFriendshipStatus(req.session.user, user,
                function(err, result) {
                  if (!_.isUndefined(result)) {
                    user.isConnection = result;
                  }
                  w_callback(err, user);
                });
          } else {
            w_callback(null, user);
          }
        } else {
          w_callback(null, user);
        }
      } ], function w_result(err, user) {
    if (!err) {
      delete user.hash;
      delete user.salt;
    }
    req.app.get('responseHandler')(err, user, res);
  });
};

route_users.logout = function(req, res) {
  if ('user' in req.session) {
    delete req.session.user;
  }
  if (req.hasOwnProperty("logout")) {
    req.logout(); // method added by everyauth
  }
  res.redirect('/');
};

route_users.islogged = function(req, res) {
  var err = null, result = null;
  if ('user' in req.session) {
    status = true;
    result = req.session.user;
  } else {
    err = [ 'User not logged in' ];
  }

  req.app.get('responseHandler')(err, result, res);
};

route_users.update = function(req, res) {
  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "Unauthorized Access" ], null, res); }

  var newUserData = req.body;
  // because the user may be messing around, get _id from session
  newUserData._id = req.session.user._id;

  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));
  userProvider.update(newUserData, function(err, result) {
    if (err) {
      nlogger.error(err, newUserData);
      err = [ "error updating data" ];
    }
    req.app.get('responseHandler')(err, result, res);
  });
};

route_users.addEmail = function(req, res) {
  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "Unauthorized Access" ], null, res); }

  var newEmail = req.body.newEmail;
  // because the user may be messing around, get _id from session
  var user = req.session.user;

  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));
  userProvider.addEmail(user, newEmail, function(err, result) {
    if (err) {
      nlogger.error(err, newEmail);
    }
    req.app.get('responseHandler')(err, result, res);
  });
};

route_users.findLinkedInUser = function(req, res) {
  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "Unauthorized Access" ], null, res); }

  if (socialService.isLoggedIn(req)) {
    var linkedInUser = socialService.findLinkedInUser(req.params.linkedinid,
        function(result) {
          console.log(">>> req.params.linkedinid: ", req.params.linkedinid);
          console.log(">>> linkedInUser: ", result);
          req.app.get('responseHandler')(null, result, res, res);
        });
  } else {
    req.app.get('responseHandler')([ "Unauthorized Access" ], null, res, res);
  }
};

route_users.getLinkedInConnections = function(req, res) {
  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "Unauthorized Access" ], null, res); }

  if (socialService.isLoggedIn(req)) {
    async.waterfall([ function getLinkedInConnection(w_callback) {
      socialService.getUsersConnections(function(error, connections) {
        w_callback(null, connections);
      });
    } ], function w_result(err, result) {
      req.app.get('responseHandler')(err, result, res);
    }); // end async
  } else {
    req.app.get('responseHandler')([ "Unauthorized Access" ], null, res, res);
  }
};

route_users.isloggedlinkedin = function(req, res) {
  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "Unauthorized Access" ], null, res); }

  var result = {
    islogged : socialService.isLoggedIn(req)
  };

  req.app.get('responseHandler')(null, result, res);
};

route_users.getConnections = function(req, res) {
  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "Unauthorized Access" ], null, res); }

  var connectionProvider = new ConnectionProvider(req.app
      .get('mongoDbInstance'));

  async.waterfall([
      function getAllConnectionIds(w_callback) {

        connectionProvider.getConnectionsForUser(req.session.user, function(
            err, result) {

          if (err) {
            w_callback(err);
          } else {
            var connArr = [];
            result.forEach(function(connObj) {
              connArr.push(connObj.conn_to);
            });
            w_callback(null, connArr);
          }
        });
      },
      function checkReverseConnectionStatus(users, w_callback) {

        var connArr = [];
        async.forEach(users, function(user_id, fe_callback) {
          var connFrom = {
            _id : user_id
          };
          var connTo = {
            _id : req.session.user._id
          };

          connectionProvider.findConnectionStatus(connFrom, connTo, function(
              err, result) {
            if (!err && result && !_.isUndefined(result._id)) {
              connArr.push(user_id);
            }
            fe_callback(err);
          });
        }, function map_result(err) {
          w_callback(err, connArr);
        });
      },

      function getUsersInfo(users, w_callback) {

        var userProvider = new UserProvider(req.app.get('mongoDbInstance'));
        async.map(users, function(user_id, map_callback) {

          userProvider.findById(user_id, function(err, userInfo) {

            userInfo._id = String(userInfo._id);

            delete userInfo.hash;
            delete userInfo.salt;

            connectionProvider.getConnectionsForUser(userInfo, function(err,
                result) {
              if (err) {
                map_callback(err);
              } else {
                userInfo.connections = result;
                map_callback(err, userInfo);
              }
            });
          });
        }, function map_result(err, results) {
          w_callback(err, results);
        });
      } ], function w_result(err, result) {
    req.app.get('responseHandler')(err, result, res);
  });
};

route_users.inviteLinkedIn = function(req, res) {
  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "User not logged" ], null, res); }

  if (socialService.isLoggedIn(req)) {
    var invite = req.body;
    socialService.sendLinkedInMemberMessage(invite.linkedInId, invite.subject,
        invite.message, function(data, error) {
          req.app.get('responseHandler')(null, {}, res, res);
        });
  } else {
    req.app.get('responseHandler')([ "Unauthorized Access" ], null, res, res);
  }
};

route_users.invite = function(req, res) {
  console.log(">>> Calling invite: ", req.session);
  if (!('user' in req.session)) { return req.app.get('responseHandler')(
      [ "User not logged" ], null, res); }

  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));
  var connectionProvider = new ConnectionProvider(req.app
      .get('mongoDbInstance'));

  var userSendingInvite = req.session.user;
  var userReceivingInvite = req.body.userReceivingInvite;
  console.log(">>> User receiving invite: ", userReceivingInvite);

  async.series([
      // check if user receiving invitation registered or not, if not - create
      // shadow user
      function checkIfUserReceivingInviteRegistered(s_callback) {
        if (_.isUndefined(userReceivingInvite._id)) {
          userProvider.createShadowUser({
            email : userReceivingInvite.email
          }, function(err, result) {
            if (err) return s_callback(err);
            if (result) {
              result._id = String(result._id.valueOf());
              userReceivingInvite = result;
            }
            return s_callback(null);
          });
        } else {
          return s_callback(null);
        }
      }, // end of checkIfUserReceivingInviteRegistered
      // send email
      function sendEmail(s_callback) {
        var feedBacksArray = req.body.postFeedbacks;
        var mailContent = 'Dear ' + (userReceivingInvite.firstName || "Pal")
            + ',<br>';
        mailContent += '<br>';
        mailContent += userSendingInvite.firstName;
        if (userSendingInvite.lastName !== undefined) {
          mailContent += ' ' + userSendingInvite.lastName;
        }
        mailContent += ' would like to invite you to Farbetter.me';

        var link = req.headers.origin + '/'; // TODO : should direct user in
        // the right view
        mailContent += '<br><br><a href=\'' + link
            + '\'>Help yourself here</a>';
        mailContent += '<br><br>Best,<br><br><i>Farbetter.me team</i>';

        var email = '';

        _.forEach(userReceivingInvite.emails, function(emailObj) {
          if (emailObj.primary == true) email = emailObj.email;
        });

        if (email == '') email = userReceivingInvite.emails[0];

        mailService.send(email, 'You are invited to Farbetter.me', mailContent,
            function(response, err) {
              s_callback(err);
            });
      } ], // end of send email
  function(err, result) {
    if (err) nlogger.error(err);
    req.app.get('responseHandler')(err, {}, res);
  }); // end of async series
};

route_users.forgotPassword = function(req, res) {

  if (('user' in req.session)) { return req.app.get('responseHandler')(
      [ "User already logged in" ], null, res); }

  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));
  var tokenProvider = new TokenProvider(req.app.get('mongoDbInstance'));

  var fpEmail = req.body.fpEmail;

  // Trying to find account with provided email, if found proceed with retrieve password
  userProvider.findByUserId(fpEmail, function(err, foundUser) {
    if (foundUser == null) {
      req.app.get('responseHandler')(["Unfortunately, your e-mail was not found."], {}, res);
    } else {

        async.waterfall([

            function preValidation(w_callback) {
              if (!fpEmail) { return w_callback("Unauthorised Access!"); }
              w_callback(null, fpEmail);
            },

            function checkIfUserExists(fpEmail, w_callback) {
              userProvider.findByUserId(fpEmail, w_callback);
            },

            function addNewFpToken(user, w_callback) {
              var tokenData = {
                type : 'fpToken',
                data : {
                  userId : String(user._id.valueOf())
                }
              };

              tokenProvider.saveToken(tokenData, function(err, token) {
                token = (token && token[0]) ? token[0] : null;
                w_callback(err, token, user);
              });
            },

            function sendFpTokenEmail(token, user, w_callback) {
              var link = req.headers.origin + '/';

              var mailContent = 'Dear ' + (user.firstName || "Pal") + ',<br>';
              mailContent += '<br>';
              mailContent += 'You seemed to have forgotten your password, right?';

              var link = req.headers.origin + '/';
              mailContent += '<br><br><a href=\'' + link + '#/forgotPassword/'
                  + token._id
                  + '\'>Please click this link to change your password</a>';

              nlogger.debug(mailContent);

              mailService.send(fpEmail, 'You requested for a new password',
                  mailContent, function(response, err) {
                    w_callback(err);
                  });
            }

        ],

        function w_result(err) {
          if (err) nlogger.error(err);

          req.app.get('responseHandler')(err, {}, res);
        });
    } // end if
  }); // end findById
};

route_users.changePassword = function(req, res) {

  var userProvider = new UserProvider(req.app.get('mongoDbInstance'));
  var tokenProvider = new TokenProvider(req.app.get('mongoDbInstance'));

  var user = req.session.user || null;

  var newPassword = req.body.newPassword;
  var tokenId = req.body.token;

  async.waterfall([

  function preValidation(w_callback) {
    if (!user) {
      if (!tokenId) return w_callback('Invalid Access');

      tokenProvider.findTokenById(tokenId, function(err, token) {
        nlogger.debug(token);

        if (!token.valid || _.isUndefined(token.data.userId)) {
          w_callback('Invalid Token');
          return;
        }
        w_callback(err, token);
      });
    } else {
      // TODO support password change while logged in
      w_callback('User already logged in');
    }
  },

  function checkIfUserExists(token, w_callback) {
    userProvider.findById(token.data.userId, w_callback);
  },

  function changePassword(user, w_callback) {
    nlogger.debug(user);

    var password = newPassword;
    user.salt = bcrypt.genSaltSync(10);
    user.hash = bcrypt.hashSync(password, user.salt);

    var newUserData = _.pick(user, 'salt', 'hash');
    newUserData._id = String(user._id.valueOf());

    userProvider.update(newUserData, w_callback);
  },

  function updateTokenIfThere(updateSuccess, updateResult, w_callback) {
    nlogger.debug("updateTokenIfThere");
    tokenProvider.update({
      _id : tokenId,
      valid : false
    }, w_callback);
  }

  ],

  function w_result(err) {
    if (err) nlogger.error(err);
    req.app.get('responseHandler')(err, {}, res);
  });

};

// for testing outcoming emails, should be accessable only on TEST environment
route_users.emails = function(req, res) {
  var emails = app.get("emails");

  var result = {
    "emails" : emails
  };
  req.app.get('responseHandler')(null, result, res);
};

module.exports = route_users;
