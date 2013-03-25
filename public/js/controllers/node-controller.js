'use strict';

 function NodeCtrl($scope, $http, $location) {
   $(document).ready(function() {

	   $scope.treeContent = "";

	   function traverse(o) {
		 $scope.treeContent+= "<ul>";
		 for (var i in o) {       
		   if (typeof(o[i])=="object") {         
			 if(o[i]["displayName"]) {
			   var displayName = o[i]["displayName"];
			   var display = o[i]["display"];
			   console.log(display + " ========= " + displayName);
			   $scope.treeContent+= "<li>" + displayName + "</li>";
			   traverse(o[i] );
			   $scope.treeContent+= "</ul>";
			 } else {
				 $scope.treeContent+= "</ul>";
				 traverse(o[i]);
			 }
		   }
		 }     
	   }      


	   $.ajax({
		url: 'http://test.greenkoncepts.com/ems/services/ResourceService/controlNodes?key=2.1363230142.ba020be798720bab865be198bdde242f7b158b8&nodeName=&callerID=callerID',
		type: 'GET',
		dataType: 'jsonp',
		contentType: "application/jsonp",
		crossDomain: true,
		jsonpCallback: 'jsonpCallback',
		success: function (response) {


		  var cmdb = response["cmdb"];
		  traverse(cmdb);
		  //$("#treeDiv").html($scope.treeContent);
		  
          $(function() {
			$("#tree").treeview({
				collapsed: true,
				animated: "medium",
				control:"#sidetreecontrol",
				persist: "location"
			});
		  })
		},
		error: function (response) {
		}
	  });	
   });

}
