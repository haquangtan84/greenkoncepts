'use strict';

 function NodeCtrl($scope, $http, $location) {
   $(document).ready(function() {
	   
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
		  var name = "";
		  var title = "";
		  var icon = "";
		  $.each(cmdb, recurse);
          
		  function recurse(key, val) {
				list += "<li>";
				if (val instanceof Object) {
					list += key + "<ul>";
					$.each(val, recurse);
					list += "</ul>";
				} else {
					if(key=="relayStatus") relayStatus = val;
					if(key=="name") name = val;
					if(key=="displayName") {
						//if(name.indexOf("Control-GKC") >=0) {
						  if(relayStatus==0) {
							title = "Click here to turn on the light for this node";
							icon = "1364470296_23413.ico";
							list += "<a href=\"#node\" data-toggle=\"tooltip\" title=\""+title+"\" data-original-title=\"Default tooltip\">" + val + " <img src=\"../../img/"+icon+"\" style=\"with:20px;height:20px;\"></img></a>";
						 } else if(relayStatus==1) {
							title = "Click here to turn off the light for this node";
							icon = "1364470318_6074.ico";
							list += "<a href=\"#node\" data-toggle=\"tooltip\" title=\""+title+"\" data-original-title=\"Default tooltip\">" + val + " <img src=\"../../img/"+icon+"\" style=\"with:20px;height:20px;\"></img></a>";
						 } else {
						   icon = "1364470339_MB__light.png";	
						   title = "This light is not able to use";
						   list += "<a href=\"#node\" data-toggle=\"tooltip\" title=\""+title+"\" data-original-title=\"Default tooltip\">" + val + " <img src=\"../../img/"+icon+"\" style=\"with:18px;height:18px;\"></img></a>";					  
						 }
						//else list += "<span data-toggle=\"tooltip\" title=\""+val+"\" data-original-title=\"Default tooltip\">" + val + " <img src=\"../img/1364470318_6074.ico\" style=\"with:20px;height:20px;\"></img></span>";
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
