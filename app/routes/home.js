var Models = require('../models');
var UserProvider = Models.users.UserProvider;
var ConnectionProvider = Models.connections.ConnectionProvider;
var StreamProvider = Models.streams.StreamProvider;
var FeedbackProvider = Models.feedbacks.FeedbackProvider;

var async = require('async');
var _ = require('underscore');
var nlogger = require('nlogger').logger(module);

var route_home = {};

route_home.getUserStream = function(req, res) {

  var page = parseInt(req.query.page);
  var loggedInUser = req.session.user;

  async
      .waterfall(
          [

              function validateRequest(w_callback) {

                if (_.isUndefined(loggedInUser))
                  return w_callback('User not logged in!');
                if (_.isNaN(page) || page <= 0) page = 1;

                var options = {
                  skip : (page) * 10,
                  limit : 10
                };

                w_callback(null, loggedInUser, options);
              },

              function getStreams(user, options, w_callback) {
                var streamProvider = new StreamProvider(req.app.get('mongoDbInstance'));

                var userId = String(user._id);
                streamProvider.getStreamForUser(userId, options, w_callback);

              },

              function getStreamInfo(streamData, w_callback) {
                streamData = streamData[0] || {};
                var streams = streamData.stream || [];

                //Start: filter out double side stream activities
                //Description from Nicolas: Palo received from John and John sent to Palo both are displayed. 
                //Only one interaction should appear, so in case both persons are your connections, only keep "John White sent a feedback to Palo Alto".                
                var dictByActionType = {};
                _.each(streams, function(item) {
                  if (dictByActionType[item.actionType] == undefined) {
                    dictByActionType[item.actionType] = [item];
                  } else {
                    dictByActionType[item.actionType].push(item);
                  }  
                });

                var feedbackReceivedStreams = removeDuplicatedStreamItems(dictByActionType['feedbackReceived'], loggedInUser._id);
                var newConnectionStreams = removeDuplicatedStreamItems(dictByActionType['newConnection'], loggedInUser._id);
                var feedbackSentStreams = dictByActionType['feedbackSent'] || []; // no need to clear duplicates
                streams = newConnectionStreams.concat(feedbackReceivedStreams, feedbackSentStreams);  
                var customSortByDate = function(a,b) {
                  if (a.actionDate < b.actionDate)
                     return -1;
                  if (a.actionDate > b.actionDate)
                    return 1;
                  return 0;
                };
                streams.sort(customSortByDate);  
                //End

                var feedbackProvider = new FeedbackProvider(req.app.get('mongoDbInstance'));
                var userProvider = new UserProvider(req.app.get('mongoDbInstance'));
                var connectionProvider = new ConnectionProvider(req.app.get('mongoDbInstance'));
                async.forEach(streams, function(stream, fe_callback) {
                  switch (stream.actionType) {
                    case 'feedbackSent':
                    case 'feedbackReceived': {

                      async.parallel([
                          function getSubjectUserInfo(p_callback) {
                            userProvider.findById(stream.subjectId, function(
                                err, user) {
                              delete user.hash;
                              delete user.salt;
                              delete user.emails;
                              stream.subjectData = user;
                              return p_callback(err);
                            });
                          },
                          function getObjectUserInfo(p_callback) {
                            userProvider.findById(stream.objectId, function(
                                err, user) {
                              delete user.hash;
                              delete user.salt;
                              delete user.emails;
                              stream.objectData = user;
                              return p_callback(err);
                            });
                          },
                          function getFeedbackInfo(p_callback) {
                            feedbackProvider.getFeedback(stream.actionId,
                                function(err, feedback) {
                                  stream.actionData = feedback;
                                  stream.f_tags = feedback.tags;
                                  return p_callback(err);
                                });

                          } ], function p_result(err, result) {

                        fe_callback(err);
                      });

                      break;
                    }
                    case 'newConnection': {
                      async.waterfall([
                          function checkConnectionStatus(p_callback) {                            
                            if (loggedInUser._id != stream.objectId && loggedInUser._id != stream.subjectId) { 
                              //means logged user is not one of the objects/subjects, it is stream about his friends
                              connectionProvider.getFriendshipStatusWith2Friends(loggedInUser._id, stream.objectId, stream.subjectId, 
                              function(err, status) {
                                stream.actionType = "newConnection-other-friends";    
                                // if (status.friend1 != true || status.friend2 != true) {
                                //   stream.actionType = "newConnection-other-friends";    
                                // }
                                return p_callback(err);
                              });  
                            } else {
                              return p_callback();
                            }
                            // return p_callback();
                          },
                          function getSubjectUserInfo(p_callback) {
                            userProvider.findById(stream.subjectId, 
                              function(err, user) {
                                delete user.hash;
                                delete user.salt;
                                delete user.emails;
                                stream.subjectData = user;
                                return p_callback(err);
                              });
                          },
                          function getObjectUserInfo(p_callback) {
                            userProvider.findById(stream.objectId, 
                              function(err, user) {
                                delete user.hash;
                                delete user.salt;
                                delete user.emails;
                                stream.objectData = user;
                                return p_callback(err);
                              });
                          } ], function p_result(err, result) {

                        fe_callback(err);
                      });

                      break;
                    }
                  }
                },

                function fe_result(err, result) {
                  // nlogger.debug(streams);
                  w_callback(err, streams);
                });
              } ], function w_result(err, result) {
            req.app.get('responseHandler')(err, result, res);
          });

};

var removeDuplicatedStreamItems = function(source, loggedInUserId) {
  source = source || [];
  _.each(source, function(item) {
    if (item.objectId != loggedInUserId && item.subjectId != loggedInUserId) {
      _.each(source, function(item2) {
        if (item != item2) {
          if (item.objectId == item2.subjectId) {
            if (item.subjectId == item2.objectId) {
              source.splice(source.indexOf(item), 1);
            }  
          }    
        }
      });
    }
  });

  return source;
}

module.exports = route_home;
