'use strict';

function FlashCtrl($route, $scope, $http, $location) {
	//$(document).ready(function() { 
		var swfVersionStr = "10.0.0";
		var xiSwfUrlStr = "playerProductInstall.swf";
		var flashvars = {};
		var params = {};
		params.quality = "high";
		params.bgcolor = "#000000";
		params.allowscriptaccess = "sameDomain";
		params.allowfullscreen = "true";
		var attributes = {};
		attributes.id = "amChartsSources";
		attributes.name = "amChartsSources";
		attributes.align = "middle";
		swfobject.embedSWF("amChartsSources.swf", "flashContent", "1000", "580", swfVersionStr, xiSwfUrlStr, flashvars, params, attributes);
		swfobject.createCSS("#flashContent", "display:block;text-align:left;");
	///});
}
