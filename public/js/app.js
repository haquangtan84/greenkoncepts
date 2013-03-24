'use strict';
var app = angular.module('fbm', [/* MODULES */]);
var user_api = '/fbm/rest/user';

app.config([ '$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl : 'p/public/home.html',
    controller : HomeCtrl
  }).when('/node', {
    templateUrl : 'p/public/node.html',
    controller : HomeCtrl
  }).when('/light', {
    templateUrl : 'p/public/light.html',
    controller : HomeCtrl
  }).otherwise({
    redirectTo : '/'
  });
} ]);



app.run(function($rootScope, $http) {
      $rootScope.root = {
        isUserLogged : false,
        lstUsers : [],
        lstConnections : [],
        tagsNameList : [],
        tagsList : []
      };
});

function navCtrl($scope, $location, $http, $rootScope) {

	$scope.navClass = function(page) {
	  var locationPath = $location.path();	  
	  var currentRoute = '';
	  if (locationPath.indexOf("/", 1) > 0) {
		currentRoute = locationPath.substring(1, locationPath.indexOf("/", 1)) || 'home';
	  } else {
		currentRoute = locationPath.substring(1) || 'home';
	  }
	  return currentRoute.indexOf(page) >=0 ? 'active' : '';
   };
   
 };

