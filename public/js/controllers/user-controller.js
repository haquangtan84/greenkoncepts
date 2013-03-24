'use strict';

function UserCtrl($scope, $routeParams, $http, $location) {

  if (!$scope.root.isUserLogged) {
    $location.path("/");
    return;
  }

  $scope.user = {
    emails : []
  };
  $scope.isEditable = function() {
    return $scope.user._id == $scope.root.loggedUser._id;
  };

  $scope.industries = [];
  $http.get('/fbm/rest/skills/getIndustryList').success(function(data, status) {
    $scope.industries = data.result;
  });

  $scope.submit = function() {
    $scope.successMsg = $scope.errMsg = '';
    var _user = angular.copy($scope.user);
    delete _user.avatar;
    delete _user.skills;
    $http.post('/fbm/rest/user/update', _user).success(function(data, status) {

      if (data.status) {
        $scope.successMsg = "Your information has been updated";
        angular.extend($scope.root.loggedUser, _user);
      } else {
        $scope.errMsg = "There seems to be a problem";
      }
    }).error(function(data, status) {
      $scope.errMsg = "There seems to be a problem";
    });
  };

  $scope.openUpdateEmailModal = function() {
    $('#updateEmail').modal('show');
  };

  $scope.addNewEmail = function addNewEmail() {
    var newEmailFlg = true;
    angular.forEach($scope.user.emails, function(emailObj) {
      if ($scope.newEmail == emailObj.email) {
        newEmailFlg = false;
      }
    });

    if (newEmailFlg) {

      $http.post('/fbm/rest/user/addEmail', {
        newEmail : $scope.newEmail
      }).success(function(result) {

        if (result.error.length > 0) {
          alert(result.error[0]);
        } else {

          $scope.user.emails.push({
            email : $scope.newEmail,
            verified : false
          });
          $scope.newEmail = '';
        }
      }).error(function(result) {
      });

    } else {
      alert($scope.newEmail + ' already exists in your email');
    }
  };

  $scope.removeEmail = function(_index) {
    $scope.user.emails.splice(_index, 1);
    $scope.submit();
  };

  $scope.makePrimaryEmail = function(email) {
    angular.forEach($scope.user.emails, function(emailObj, index) {
      emailObj.primary = emailObj.email == email ? true : false;
      if (emailObj.primary) $scope.primaryEmail = emailObj.email;
      $scope.user.emails[index] = emailObj;
    });

    $scope.submit();
  };

  $scope.$watch(function() {
    return $scope.user.emails;
  }, function() {
    angular.forEach($scope.user.emails, function(emailObj, index) {
      if (emailObj.primary) $scope.primaryEmail = emailObj.email;
    });
  });

  if (angular.isDefined($routeParams.userId)) {
    $scope.user._id = $routeParams.userId;
  } else if ($scope.root.isUserLogged) {
    $scope.user._id = $scope.root.loggedUser._id;
  } else {
    $scope.errMsg = "Unauthorised Access";
  }

  if (angular.isDefined($scope.user._id)) {
    $http
        .get('/fbm/rest/user/' + $scope.user._id + '/get?getConnectionStatus=1')
        .success(
            function(data, status) {
              if (data.status) {
                if (angular.isDefined(data.result._id)) {
                  $scope.isConnection = data.result.isConnection || false;
                  delete data.result.isConnection;
                  if (data.result.skills_list
                      && Array.isArray(data.result.skills_list)) {
                    var userSkills = [];
                    data.result.skills_list.forEach(function(skill) {
                      userSkills.push(skill.name);
                    });
                    data.result.skills = userSkills.join(', ');
                  }
                  $scope.user = data.result;

                  if (angular.isUndefined($scope.user.settings)) {
                    $scope.user.settings = {
                      notification : {
                        period : "immediately",
                        on : true
                      }
                    };
                  }

                  if ($scope.user.avatar == undefined
                      || $scope.user.avatar == "")
                    $scope.user.avatar = getUserAvatar($scope.user);

                } else {
                  $scope.errMsg = "User doesn't exist";
                }
              } else {
                $scope.errMsg = "Couldn't recieve user info";
              }
            })
        .error(function(data, status) {
          $scope.errMsg = "There seems to be a problem";
        })
        .error(
            function(data, status) {
              console
                  .log(
                      "ERROR at /fbm/rest/user/' + $scope.user._id + '/get?getConnectionStatus=1'",
                      data, status);
            });
  }
};

function UserListCtrl($scope, $http, $location, $rootScope) {

  if (!$scope.root.isUserLogged) {
    $location.path("/");
    return;
  }

  $scope.users = [];
  $http.get('/fbm/rest/users').success(function(data) {
    data.result.forEach(function(user, index, arr) {
      if (user._id == $rootScope.root.loggedUser._id) return;
      user.avatar = getUserAvatar(user);
      $scope.users.push(user);
    });
  });

  $scope.connections = [];
  $http.get('/fbm/rest/user/getConnections').success(function(data) {
    data.result.forEach(function(user, index, arr) {
      if (user._id == $rootScope.root.loggedUser._id) return;
      user.avatar = getUserAvatar(user);
      $scope.connections.push(user);
    });
  });
};

function UserSignUpCtrl($scope, $routeParams, $http, $location, $rootScope) {
  $scope.user = {};
  $scope.submit = function() {
    // Weird bug? with NG... to be investigated later
    // If this is sent, the server doesn't get user...
    $("#reqistration-alert").hide();

    var data = {
      user : $scope.user
    };
    $http
        .post('/fbm/rest/user/register', data)
        .success(
            function(data, status) {
              if (data.status) {

                // authorization after registration
                $http
                    .post("/fbm/rest/user/login", {
                      login : $scope.user.email,
                      password : $scope.user.password
                    })
                    .success(
                        function(data, status) {
                          $rootScope.root.loggedUser = data.result;
                          $rootScope.root.loggedUser.avatar = getUserAvatar($rootScope.root.loggedUser);
                          $rootScope.root.isUserLogged = true;

                          $("#registration-done-modal").modal("show");
                          $location.path("#/home");

                        })
                    .error(
                        function(data, status) {
                          $scope.registered = "An error occured at authorization after registration: "
                              + data.error.join(', ');
                          $("#reqistration-alert").show();
                        });

              } else {
                $scope.registered = "An error occured : "
                    + data.error.join(', ');
                $("#reqistration-alert").show();
              }
            }).error(function(data, status) {
        });
  };
};

function UserSignInCtrl($scope, $http, $location, $rootScope) {

  if ($scope.root.isUserLogged) {
    $location.path("/");
    return;
  }

  $scope.submit = function() {
    // Weird bug with NG... to be investigated later
    $scope.showMessage = false;
    var data = {};
    if (this.user) {
      data = {
        login : this.user.login,
        password : this.user.password
      };
    }
    $http
        .post('/fbm/rest/user/login', data)
        .success(
            function(data, status) {
              if (data.status) {
                $rootScope.root.loggedUser = data.result;
                $rootScope.root.loggedUser.avatar = getUserAvatar($rootScope.root.loggedUser);                
                $rootScope.root.isUserLogged = true;
                $location.path("/");
              } else {
                $scope.showMessage = true;
                console.error(data.error);
              }
            }).error(function(data, status) {
        });
  };

  $scope.openFpModal = function() {
    $("#fp-modal").modal("show");
    $scope.fpError = [];
    $scope.fpInfo = null;
  };

  $scope.openFpModal = function() {
    $("#fp-modal").modal("show");
    $scope.fpError = [];
    $scope.fpInfo = null;
  };

  $scope.fpSubmit = function() {
    $scope.fpError = [];
    $scope.fpInfo = null;

    $http.post('fbm/rest/user/forgotPassword', {
      fpEmail : $scope.fpEmail
    }).success(function(response) {
      if (response.status) {
        $scope.fpInfo = "A link has been sent to your email. Please check your email inbox and click the link we sent you to create a new password.";
      } else {
        if (Array.isArray(response.error) && response.error.length > 0) {
          $scope.fpError = response.error;
        }
      }
    }).error(
        function(response) {
          if (response && Array.isArray(response.error)
              && response.error.length > 0) {
            $scope.fpError = response.error;
          }
        });
  };
};

function forgotPasswordCtrl($scope, $routeParams, $http, $location) {
  $scope.errMsg = [];
  $scope.infoMsg = [];

  var fpToken = $routeParams.fpToken;
  $scope.newPasswordSubmit = function() {

    $scope.errMsg = [];
    $scope.infoMsg = [];

    if ($scope.newPassword1 != $scope.newPassword2) { return $scope.errMsg
        .push('The two passwords do not match'); }

    $http.post('fbm/rest/user/changePassword', {
      newPassword : $scope.newPassword1,
      token : fpToken
    }).success(function(response) {
      if (response.status) {
        $scope.passwordChangeSuccess = true;
        window.setTimeout(
            function() {
              document.location = "#/signin";
            }, 2000);
      } else {
        if (Array.isArray(response.error) && response.error.length > 0) {
          $scope.errMsg = response.error;
        }
      }
    }).error(
        function(response) {
          if (response && Array.isArray(response.error)
              && response.error.length > 0) {
            $scope.errMsg = response.error;
          }
        });
  };

}

function SendInviteCtrl($scope, $routeParams, $http, $location) {

  if (!$scope.root.isUserLogged) {
    $location.path("/");
    return;
  }

  $scope.submit = function() {
    var self = this;
    toggleLoadingStatus(true);

    $http.post("/fbm/rest/user/invite", {
      "userReceivingInvite" : self.user
    }).success(function(resultData, status) {
      toggleLoadingStatus(false);
      $scope.showSuccess = true;
      $scope.message = "Invite has been sent to " + self.user.email;

      self.user = {}; // this will reset form
    }).error(function(resultData, status) {
      $scope.showError = true;
      $scope.message = "We could not send invite. Please try again.";
    });
  };

  function toggleLoadingStatus(flag) {
    $scope.loading = flag;
    if (flag) {
      $scope.showError = false;
      $scope.showSuccess = false;
    }
  }
  ;
};

function UserLinkedInCtrl($scope, $http, $location, $rootScope) {

  if (!$scope.root.isUserLogged) {
    $location.path("/");
    return;
  }

  $scope.isLoggedLinkedIn = false;
  $scope.linkedInConnections = [];

  var conns = [];

  function isLinkedinLogged() {
    $http.get("/fbm/rest/user/isloggedlinkedin").success(
        function(result, status) {
          if (status) $scope.isLoggedLinkedIn = result.result.islogged;
        }).error(function() {
      $scope.isLoggedLinkedIn = false;
    });
  }
  ;

  $scope.getUsersLinkedInConnections = function() {
    $scope.linkedInConnections = [];
    $scope.inviteConnectionsMessageShow = true;
    $scope.inviteConnectionsMessage = "Loading...";
    $("#linkedin-connections-modal").modal("show");

    $http
        .get("/fbm/rest/user/getLinkedInConnections")
        .success(
            function(result, status) {
              if (result.status) {
                if (result.result.length > 0) {
                  $scope.inviteConnectionsMessageShow = false;
                  $scope.linkedInConnections = result.result;
                  conns = result.result;
                } else {
                  $scope.inviteConnectionsMessage = "Unfortunately you don't have connections.";
                }
              } else {
                $scope.inviteConnectionsMessage = "Error: " + result.error[0];
              }
            }).error(function(result, status) {

        });
  };

  $scope.sendFeedbackToLinkedInConnection = function(connection) {
    $("#linkedin-connections-modal").modal("hide");
    $location.path("#/feedbacks/sendFeedback/" + connection.linkedInId
        + "?type=linkedin");
  };

  $scope.doFilterConnections = function() {

    $scope.linkedInConnections = conns
        .filter(function(el) {
          var criteria = $scope.filter.criteria;
          return ((el.firstName + " " + el.lastName).toLowerCase().search(
              criteria.toLowerCase()) != -1)
              || (el.proHeadline.toLowerCase().search(criteria.toLowerCase()) != -1);
        });
  };

  isLinkedinLogged();
}

function TestUserEmailsCtrl($scope, $http, $location, $rootScope) {
  console.log(">>> TestUserEmailsCtrl");
  $scope.emails = [];

  $http.get("/fbm/rest/user/emails").success(function(result, status) {
    console.log(">>> Result Get Emails: ", result);
    $scope.emails = result.result.emails;
  }).error(function(result, status) {
    console.log(">>> Error Get Emails");
  });
};

function UserStreamCtrl($scope, $http, $location, $rootScope) {

  if (!$scope.root.isUserLogged) {
    $location.path("/");
    return;
  }

  $scope.onShareFeedbackClick = function() {
    $scope.$emit("event-do-share-feedback");
  };

  $scope.streams = undefined;

  $http.get('/fbm/rest/home/getUserStream/').success(
      function(response, status) {
        var streams = response.result || undefined;
        streams.reverse();

        angular.forEach(streams, function(stream) {
          if (angular.isUndefined(stream.objectData.avatar)) {
            stream.objectData.avatar = getUserAvatar(stream.objectData);
          }
          if (angular.isUndefined(stream.subjectData.avatar)) {
            stream.subjectData.avatar = getUserAvatar(stream.subjectData);
          }

          stream.showFeedback = false;

          if (stream.objectId == $rootScope.root.loggedUser._id) {
            stream.showFeedback = true;
          }
        });

        $scope.streams = streams;
      }).error(function(response, status) {
  });

}

function getUserAvatar(user) {
  if (!user || angular.isUndefined(user.emails)) {
    return '//www.gravatar.com/avatar/'
      + md5("dssdsjhk") + '?d=retro';
  }
  if (angular.isDefined(user.avatar)) {
    return user.avatar;
  }

  var userEmail = '';
  angular.forEach(user.emails, function(emailObj) {
    if (emailObj.primary == true) {
      userEmail = emailObj.email;
    }
  });
  if (userEmail == '') {
    userEmail = user.emails[0].email;
  }
  return '//www.gravatar.com/avatar/' + md5(userEmail) + '?d=retro';
}
