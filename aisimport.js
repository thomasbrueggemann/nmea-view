var fs = require("fs");
var readline = require("readline");
var nmea = require("nmea-0183");
var turf = require("turf");
var concat = require("concat-files");

var data = [];
var args = process.argv.slice(2);

if (args.length !== 2) {
	console.log("Usage: node aisimport.js ./folder trackname");
	process.exit();
}

// read all files in folder
fs.readdir(args[0], function(err, files) {
	if (err) throw err;

	console.log("Using files:", files);

	files = files.map(function(item) {
		return args[0] + "/" + item;
	});

	// marge all files in folder into a temp file
	concat(files, "merged.tmp", function() {

		// create a line-by-line reader
		var rd = readline.createInterface({
			input: fs.createReadStream("merged.tmp"),
			output: process.stdout,
			terminal: false
		});

		// line by line
		rd.on("line", function(line) {

			if (line.indexOf("$GPGGA") === 0) {

				var aisObj = nmea.parse(line);

				// is data valid?
				if (aisObj.hdop < 20 && aisObj.latitude !== "NaN" && aisObj.longitude !== "NaN") {

					data.push({
						"time": parseInt(aisObj.time),
						"latitude": parseFloat(aisObj.latitude),
						"longitude": parseFloat(aisObj.longitude),
					});
				}
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
					"coordinates": []
				}
			};

			geojson["geometry"]["coordinates"] = coords;

			var tolerance = 0.000005;
			var simplified = turf.simplify(geojson, tolerance, false);

			console.log(coords.length + " simplified to -> ", simplified.geometry.coordinates.length);

			// write geojson
			fs.writeFile(args[1] + ".geojson", JSON.stringify(simplified));
			fs.unlink("merged.tmp");
			console.log("Ready. Check file", args[1] + ".geojson");
		});

	});
});