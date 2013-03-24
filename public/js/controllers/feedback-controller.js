'use strict';
var root_api = '/fbm/rest';

// function SkillCtrl($scope, $http, $location) {

//   if (!$scope.root.isUserLogged) {
//     $location.path("/");
//     return;
//   }

//   $scope.tags = [];
//   $http.get(root_api + '/skills')
//     .success(function(data, status) {
//       if (data.result) {
//         $scope.tags = data.result;
//       }
//   });

//   $scope.addSkill = function() {
//     // TODO : check that skill is not present
//     var newSkillName = $scope.newSkillName;

//     var duplicates = $.grep($scope.skills, function(e) {
//       return e.name == newSkillName;
//     });
//     if (duplicates.length > 0) {
//       var alertStr = 'It seems that you have already added "' + newSkillName;
//       alert(alertStr);
//     } else {
//       $scope.skills.push({
//         name : newSkillName
//       });
//       $scope.newSkillName = '';
//       $http.post(root_api + '/skill/' + newSkillName + '/insert');
//     }

//   };
// }

function SendFeedbackCtrl($scope, $routeParams, $http, $location, $rootScope, $route) {

  if ($location.path() == '/feedbacks/sendFeedback' && !$rootScope.root.isUserLogged) {
    $location.path("/");
    return;
  }
  
  $scope.newFeedback = {};
  $scope.filterEmailUsers = [];
  $scope.isShowDropDown = false;
  $scope.rateUser = true;
  $scope.ratingResults = new Array();
  $scope.userReceivingFeedback = {};
  $scope.isLinkedInUser = (angular.isDefined($routeParams.type) && $routeParams.type == "linkedin");
  $scope.isSelectUser = false;
  $scope.connections = [];
  

  // check if it is LinkedIn User
  if ($scope.isLinkedInUser) {
    $http.get(root_api + '/user/linkedin/' + $routeParams.userId + "/get")
        .success(function(response) {
          $scope.userReceivingFeedback = response.result || {};
        }).error(function() {

        });
  } else {
    if (angular.isDefined($routeParams.userId)) {
      $http.get(root_api + '/user/' + $routeParams.userId + "/get").success(
          function(response) {
            // TODO: this should be fetched from server
            $scope.userReceivingFeedback = response.result || {};
          });
    } else {
      $scope.userReceivingFeedback = {
        email : '',
        skills_list : []
      };
    }
  }
  
  $("[rel='tooltip']").tooltip();

   
  $(document).ready(function() {

    $("#sendingFeedbackForm").find('#userEmail').typeahead({
		source: function(query, process) {
		  return $scope.connections;
		},
		updater: function(item) {
		  item = htmlDecode(item);
		  return item.substring(item.lastIndexOf("<")+1, item.lastIndexOf(">"));
		}
	});

	$("#sendingFeedbackModal").find('#userEmail').typeahead({
		source: function(query, process) {
		  return $scope.connections;
		},
		updater: function(item) {
		  item = htmlDecode(item);
		  return item.substring(item.lastIndexOf("<")+1, item.lastIndexOf(">"));
		}
	});

	$("#sendingFeedbackForm").find("#inputContent").limita({	  
	  limit: 300,
	  id_result: "counterForm",
	  alertClass: "alertCharacters"
	});
	$("#sendingFeedbackModal").find("#inputContent").limita({	  
	  limit: 300,
	  id_result: "counter",
	  alertClass: "alertCharacters"
	});
	
	//Get list of tag
    $http.get(root_api + '/skill/tags').success(
      function(data) {
		if(data.result.tags && data.result.tags.length > 0) {
		  $rootScope.root.tagsList = data.result.tags;
		  data.result.tags.forEach(function(tag, index) {
			if($.inArray(tag.name, $rootScope.root.tagsNameList) < 0)  $rootScope.root.tagsNameList.push(tag.name);
		  });
		};
    });	
    
    $(function(){           
	  $("#sendingFeedbackForm").find("#myTags").tagit({
	    placeholderText: "Type a tag and press Enter",
		allowSpaces: true,
	    availableTags: $rootScope.root.tagsNameList
	  });
	  $("#sendingFeedbackModal").find("#myTags").tagit({
	    placeholderText: "Type a tag and press Enter",
		allowSpaces: true,
	    availableTags: $rootScope.root.tagsNameList
	  });           
	});   
    
    
	//Get list of connections
    var emailUsers = [];    
    $http.get('/fbm/rest/user/getConnections').success(
      function(data) {
		if(data.result.length > 0) {
	      data.result.forEach(function(user, index, arr) {
	        if (user._id == $rootScope.root.loggedUser._id) return;
	          user.emails.forEach(function(email, index) {
		        emailUsers.push({
		          firstName : user.firstName,
		          lastName : user.lastName,
		          email : email.email
	            });
                $scope.connections.push("\"" + user.firstName + " " + user.lastName + "\" &lt;"+email.email+"&gt;");				  
	        });	  
	      });		  
	    }		
      });  
           
  });  

  $scope.isAnon = function() {
    if ($scope.isLinkedInUser) {
      return !angular.isDefined($scope.userReceivingFeedback.linkedInId);
    } else {
      return !angular.isDefined($scope.userReceivingFeedback._id);
    }
  };

  function htmlDecode(value) {
    if (value) {
        return $('<div />').html(value).text();
    } else {
        return '';
    }
  }
  
  $scope.cleanData = function() {
	$scope.userReceivingFeedback.email = "";
  };
  
  $scope.isShow = function() {
    return false;
  };

  //Reset the Form after sending feedback 
  $scope.resetSendFeedbackForm = function() {
	var className = $("#sendingFeedbackModal").attr('class');
	var formElement;
    if(className.indexOf("fade in") >= 0)
      formElement = $("#sendingFeedbackModal");
	else
	  formElement = $("#sendingFeedbackForm");

    $("li").remove(".tagit-choice");
	$scope.userReceivingFeedback.email = "";
    $scope.newFeedback.comment = "";
	$(formElement).find("#counterForm").text("300");
  };
 
  
  $scope.sendFeedback = function() {
    $scope.showError = $scope.showSuccess = false;
    $scope.loading = true;
    var className = $("#sendingFeedbackModal").attr('class');
	var formElement;
    if(className.indexOf("fade in") >= 0)
      formElement = $("#sendingFeedbackModal");
	else
	  formElement = $("#sendingFeedbackForm");
    var tagsInput = tagsInput = $(formElement).find("#myTags").tagit("assignedTags");
    
	//Build the tag list for sending feedback
    var tagsArray = [];
    tagsInput.forEach(function(tag, index) {
	  var i = $rootScope.root.tagsList.length;
	  var isHit = false;
	  while(i--) {
	    if($rootScope.root.tagsList[i].name == tag) {
		  tagsArray.push({
			_id : $rootScope.root.tagsList[i]._id
		  });
		  isHit = true;
		  break;
		};
	  }
	  if(!isHit) {
	    tagsArray.push({
		  name : tag		
	    });
	  };
    });
    var postFeedbacks = [];
    var _feedbacks = angular.copy($scope.userReceivingFeedback.skills_list) || [];
    
    if (angular.isDefined($scope.newFeedback)) {
      _feedbacks.push($scope.newFeedback);
    }
    //MOCK: emulate new feedback form
    var  feedback = {
      comment: $scope.newFeedback.comment,
      tags: tagsArray
    };
    $http.post(root_api + '/skill/sendFeedback', {
      "postFeedback" : feedback,
      "userReceivingFeedback" : $scope.userReceivingFeedback,
      "isLinkedInUser" : $scope.isLinkedInUser
    }).success(
        function() {
          $scope.message = "Your feedback has been sent."
              + "\nThanks for making the world a better place :)";
          $scope.loading = !$scope.loading;
		  $scope.resetSendFeedbackForm();

      if ($location.path() == "/home") {
        $route.reload(); // simple refresh home page to see new feedback
      }

		  if(className.indexOf("fade in") >= 0) {
			 
			 $('#sendingFeedbackModal').modal('hide');
			 return;
		  }		  
		  $scope.showSuccess = true;
          $scope.loading = !$scope.loading;
          if (angular.isDefined($scope.newFeedback)) {
            $scope.newFeedback = {};
          }
          
        }).error(function(e) {
      $scope.message = "Error sending feedback : " + e;
      $scope.showError = true;
      $scope.loading = !$scope.loading;
    });
  };
};

function FeedbackListCtrl($scope, $routeParams, $http, $location) {
  if ($location.path() == '/skills/feedbacks' && !$scope.root.isUserLogged) {
    $location.path("/");
    return;
  }

  $scope.$on("handleBroadcast", function() {
    $scope.getSkillFeedbackList();
  });

  $scope.feedbacks = [];

  var feedbacks = [];

  $scope.filterFeedbacksByTag = function(filterTag) {
    if (filterTag == "") {
      $scope.feedbacks = feedbacks;
      return;
    }

    var filtered = [];
    angular.forEach(feedbacks, function(item) {
      angular.forEach(item.feedback.tags, function(tag) {
        if (tag.name == filterTag.name)
          filtered.push(item);
      })
    });
    $scope.feedbacks = filtered;
  };

  $scope.getSkillFeedbackList = function() {
    if (!$scope.root.isUserLogged) { return; }
    $http.get(root_api + '/skill/feedbacks')
        .success(
            function(response) {
              feedbacks = response.result.generalFeedbacks;

              $scope.tags = [];
              angular.forEach(feedbacks, 
                function(feedBackItem, index) {
                  angular.forEach(feedBackItem.feedback.tags, 
                    function(tagItem) {
                      if ($scope.tags.indexOf(tagItem.name) == -1)
                        $scope.tags.push(tagItem);
                  });
              });

              $scope.feedbacks = feedbacks;
            });
  };

  $scope.sendReminder = function(uid) {
    $http.post(root_api + '/skill/sendReminder', {
      userReceivingReminder : {
        _id : uid
      }
    }).success(function(data) {
      alert('Your reminder has been sent');
    });
  };

  $scope.$watch(function() {
    return $location.path();
  }, function() {
    $scope.getSkillFeedbackList();
  });

  $scope.getSkillFeedbackList();
}

function FeedbackDetailCtrl($scope, $routeParams, $http, $location) {

  if (!$scope.root.isUserLogged) {
    $location.path("/");
    return;
  }

  $scope.feedback = {};

  $http.get(root_api + '/skill/feedback/' + $routeParams.feedbackId).success(
      function(response) {
        var res_feedback = response.result;
        res_feedback.skillPeriod = new Date(res_feedback.f_year,
            res_feedback.f_month).toLocaleDateString();

        $http.get(root_api + '/user/' + res_feedback.f_from + '/get').success(
            function(res_user) {
              res_feedback.f_from_detail = res_user.result;
              $scope.feedback = res_feedback;
            });
      });

}
