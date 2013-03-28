'use strict';

 function NodeCtrl($scope, $http, $location) {
   $(document).ready(function() {
       
		
	   

	   function traverse(o) {
		 for (var i in o) {       
		   if (typeof(o[i])=="object") {         
			 if(o[i]["displayName"]) {
			   var displayName = o[i]["displayName"];
			   var display = o[i]["display"];
			   $scope.treeContent+= "<li>" + displayName + "</li>";
			   $scope.treeContent+= "<ul>";
			   traverse(o[i] );
			   $scope.treeContent+= "</ul>";
			   
			 } else {
				 $scope.treeContent+= "<ul>";				 
				 traverse(o[i]);
				 $scope.treeContent+= "</ul>";
			 }
		   }
		 }     
	   }  
	   
	   String.prototype.replaceAll = function( token, newToken, ignoreCase ) {
			var _token;
			var str = this + "";
			var i = -1;

			if ( typeof token === "string" ) {

				if ( ignoreCase ) {

					_token = token.toLowerCase();

					while( (
						i = str.toLowerCase().indexOf(
							token, i >= 0 ? i + newToken.length : 0
						) ) !== -1
					) {
						str = str.substring( 0, i ) +
							newToken +
							str.substring( i + token.length );
					}

				} else {
					return this.split( token ).join( newToken );
				}

			}
		return str;
		};


	   $.ajax({
		url: 'http://test.greenkoncepts.com/ems/services/ResourceService/controlNodes?key=2.1363230142.ba020be798720bab865be198bdde242f7b158b8&nodeName=&callerID=callerID',
		type: 'GET',
		dataType: 'jsonp',
		contentType: "application/jsonp",
		crossDomain: true,
		jsonpCallback: 'jsonpCallback',
		success: function (response) {
		  var cmdb = response["cmdb"];
		  var list = "";
		  var relayStatus = "";
		  var title = "";
		  $.each(cmdb, recurse);
          
		  function recurse(key, val) {
				list += "<li>";
				if (val instanceof Object) {
					list += key + "<ul>";
					$.each(val, recurse);
					list += "</ul>";
				} else {
					if(key=="relayStatus") relayStatus = val;
					if(key=="name" || key=="displayName") {
						if(key=="name" && val.indexOf("Control-GKC") >=0) {
						  if(relayStatus==0)
							title = "Click here to turn on the light for this node";
						  else
							title = "Click here to turn off the light for this node";
						  list += "<a href=\"#node\" data-toggle=\"tooltip\" title=\""+title+"\" data-original-title=\"Default tooltip\">" + val + "</a>";
						}
						else list += "<span data-toggle=\"tooltip\" title=\""+val+"\" data-original-title=\"Default tooltip\">" + val + "</span>";
					}
				}
				list += "</li>";

		  }
		  list = list.replaceAll("<li></li>","");
		  list = list.replaceAll("<ul></ul>","");
		  //Fill all of control nodes list
		  $("#tree").html(list);		
		  //Init tree 
		  $(function() {
			$("#tree").treeview({
				collapsed: true,
				animated: "medium",
				control:"#sidetreecontrol",
				persist: "location"
			});
		  });
		  $("[data-toggle='tooltip']").tooltip();  
          
		},
		error: function (response) {
		}
	  });	
   });

}
