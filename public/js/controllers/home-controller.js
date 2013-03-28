'use strict';

function HomeCtrl($route, $scope, $http, $location) {
	  
	  $scope.chart;
	  $scope.chartData = [];
	  
  $(document).ready(function() { 
	   $.ajax({
		url: 'http://test.greenkoncepts.com/ems/services/ResourceService/binnedEvents?key=2.1363230012.d593eb3472e8f0b8346fae1bf53aa4e38f6d96f4&nodeNames=ci_gkoffice&beginDate=1363143611618&endDate=1363230011619&binEnum=1&dataNames=Energy&callerID=callerID',
		type: 'GET',
		dataType: 'jsonp',
		contentType: "application/jsonp",
		crossDomain: true,
		success: function (response) {
		  var eventBean = response["eventBean"];
		  
		  
		  $.each(eventBean, function(i,object) {
			var timestamp = object["timestamp"];
			var time = timestamp["time"];
			var d = new Date();
			d.setMilliseconds(time);
			time = d.getUTCHours();
			var dataBean = object["dataBean"];
			var value = dataBean[0]["value"];
			var units = dataBean[0]["units"];
			var color = "#0D8ECF";
			if(value > 4000) color = "#FF0F00";
			else if(value > 3000) color = "#FF6600";
			else if(value > 2500) color = "#FF9E01";
			else if(value > 2000) color = "#FCD202";
			else if(value > 1500) color = "#F8FF01";
			else if(value > 1000) color = "#04D215";
			else if(value > 500) color = "#0D8ECF";
			else color = "#0D8ECF";
			value = value / 1000;
		    value = Math.round(value*100)/100;
			$scope.chartData.push({
			  hour: time + ":00",
			  value: value,
			  color: color
			});
		  });
		  //Building the column chart
		  //AmCharts.ready(function() {
			
			// SERIAL chart
			$scope.chart = new AmCharts.AmSerialChart();
			$scope.chart.dataProvider = $scope.chartData;
			$scope.chart.categoryField = "hour";
			$scope.chart.marginRight = 0;
			$scope.chart.marginTop = 0;    
			$scope.chart.autoMarginOffset = 0;
			// the following two lines makeschart 3D
			$scope.chart.depth3D = 20;
			$scope.chart.angle = 30;
            
			// AXES
			// category
			var categoryAxis = $scope.chart.categoryAxis;
			categoryAxis.labelRotation = 90;
			categoryAxis.dashLength = 5;
			categoryAxis.gridPosition = "start";

			// value
			var valueAxis = new AmCharts.ValueAxis();
			valueAxis.title = "Energy";
			valueAxis.dashLength = 5;
			$scope.chart.addValueAxis(valueAxis);

			// GRAPH            
			var graph = new AmCharts.AmGraph();
			graph.valueField = "value";
			graph.colorField = "color";
			graph.balloonText = "[[hour]] : [[value]] kWh";
			graph.type = "column";
			graph.lineAlpha = 0;
			graph.fillAlphas = 1;
			$scope.chart.addGraph(graph);
			
			
            
			// WRITE
			$scope.chart.write("chartdiv");
			
			
		  //});
		  //End of the column $scope.chart 
		},
		error: function (response) {
		  console.log(response);
		}
	  });	
  });
}
