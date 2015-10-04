var fs = require("fs");
var readline = require("readline");
var nmea = require("nmea-0183");
var turf = require("turf");

var data = [];

// create a line-by-line reader
var rd = readline.createInterface({
	input: fs.createReadStream("AIS_000004.txt"),
	output: process.stdout,
	terminal: false
});

// line by line
rd.on("line", function(line) {

	if (line.indexOf("$GPGGA") === 0) {

		var aisObj = nmea.parse(line);

		data.push({
			"time": parseInt(aisObj.time),
			"latitude": parseFloat(aisObj.latitude),
			"longitude": parseFloat(aisObj.longitude),

		})
	}
});

// data read till the end
rd.on("close", function() {

	// sort by date
	data.sort(function(a, b) {
		return a.time - b.time;
	});

	var coords = data.map(function(item) {
		return [item.longitude, item.latitude];
	});

	var geojson = {
		"type": "Feature",
		"properties": {},
		"geometry": {
			"type": "LineString",
			"coordinates": [
				[coords]
			]
		}
	};

	var tolerance = 0.1;
	var simplified = turf.simplify(geojson, tolerance, false);

	// write geojson
	fs.writeFile("track.geojson", JSON.stringify(simplified));
});