'use strict';

 function NodeCtrl($scope, $http, $location, $route) {
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
		
		function lightAction(name, relayStatus) {
		  var actionUrl = "http://test.greenkoncepts.com/ems/services/ResourceService/control?key=2.1363230266.a33dbb9f87479c8ea2aad6c5d775c2f5285dde2&id="+name+"&command=Relay+Status%3D"+relayStatus+"%3BAnalog+Output%3D100&isGroupControl=false&callerID=callerID";
		  $.ajax({
			url: actionUrl,
			type: 'GET',
			dataType: 'jsonp',
			contentType: "application/jsonp",
			crossDomain: true,
			jsonpCallback: 'jsonpCallback',
			success: function (response) {
			  $route.reload();
			},
			error: function (response) {
		    }
		  });
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
		  var list = "";
		  var relayStatus = "";
		  var name = "";
		  var title = "";
		  var icon = "";
		  
		 function parseConfig(configs) {
			list += "<li>";
			if(configs["displayName"]) {
			  relayStatus = configs["relayStatus"];
			  name = configs["name"];
			  if(!configs["children"]) {
				  if(relayStatus==0) {
					title = "Click here to turn on the light for this node";
					icon = "1364470296_23413.ico";
					list += "<a href=\"#node\" data-toggle=\"tooltip\" title=\""+title+"\" data-original-title=\"Default tooltip\"><strong>" + configs["displayName"] + "</strong> <img src=\"../../img/"+icon+"\" style=\"with:18px;height:18px;\"></img></a>";
				  } else if(relayStatus==1) {
					title = "Click here to turn off the light for this node";
					icon = "1364470318_6074.ico";
					list += "<a href=\"#node\" data-toggle=\"tooltip\" title=\""+title+"\" data-original-title=\"Default tooltip\"><strong>" + configs["displayName"] + "</strong> <img src=\"../../img/"+icon+"\" style=\"with:18px;height:18px;\"></img></a>";
				  } else {
					icon = "1364470339_MB__light.png";	
					title = "This light is not able to use";
					list += "<span data-toggle=\"tooltip\" title=\""+title+"\" data-original-title=\"Default tooltip\"><strong>" + configs["displayName"] + "</strong> <img src=\"../../img/"+icon+"\" style=\"with:16px;height:16px;\"></img></span>";					  
				  }
			  } else {
				  list += "<strong>" + configs["displayName"] + "</strong>";
			  }
		    } 
			for (var element in configs) {				  
				if (typeof(configs[element]) == "object") {
					if(configs["displayName"]) {
					  list += "<ul>";
					  parseConfig(configs[element]);
					  list += "</ul>";
					} else parseConfig(configs[element]);
				}
			}
			list += "</li>";
		 }
		 parseConfig(cmdb);		  

		 
		  list = list.replaceAll("<li><li>","<li>");
		  list = list.replaceAll("</li></li>","</li>");
		  list = list.replaceAll("<li></li>","");
		  list = list.replaceAll("<ul></ul>","");
		  //Fill all of control nodes list
		  $("#tree").html(list);		
		  //Init tree 
		  $(function() {
			$("#tree").treeview({
				expanded: true,
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
