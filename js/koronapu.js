// Check if string is empty
function isEmpty(str) {
	return (!str || 0 === str.length);
}

// Extract variables from URL
// Example: var lat = getUrlVars()["lat"];
function getUrlVars() {
	var vars = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		vars[key] = value;
	});
	return vars;
}

// For debugging. Call with 'setInterval(function(){ logMarkerLocation(); }, 1000);'
function logMarkerLocation() {
	console.log("DEBUG: MARKER LOCATION:", userMarker.getLatLng()["lat"], userMarker.getLatLng()["lng"]);
};

function generateSalt() {
	var generateSalt = new Math.seedrandom(window.crypto.getRandomValues(new Uint32Array(1)));	// CSPRN seed
	parts = [];
	i=0;
	while (i < 4) {
		i++;
		parts.push((generateSalt() * 1000000000000000000).toString(36));
	}
	salt = parts.join("");
	return salt;
}

// Center the map to selected position
function centerToPosition(position) {
	if (position.coords != null) {
		console.log("FLY TO:", position)
		mymap.flyTo([position.coords["latitude"], position.coords["longitude"]], 13);
	} else {
		console.log("SET MAP TO:", position)
		if ( position[2] != null) {
			zoomLevel = position[2];
		};
		mymap.setView([position[0], position[1]], zoomLevel);
	};
};

// Center the map to users geolocation
function centerToMyPosition() {
	$.geolocation.get().done(centerToPosition).fail(noLocation);
}

var newMarkerIcon = L.icon({
	iconUrl:     'img/new-location.png',
	iconSize:    [128, 128],	// size of the icon
	iconAnchor:  [65, 124],	// point of the icon which will correspond to marker's location
	popupAnchor: [0, 0]			// point from which the popup should open relative to the iconAnchor
});

function userAddMarker() {
	lat = mymap.getCenter().lat;
	lon = mymap.getCenter().lng;

	if (zoomLevel < 14 || zoomLevel > 14) {	// Zoom to get all decimals to 'lat' and 'lon'
		mymap.flyTo([lat, lon], 14);
	} else {
		mymap.flyTo([lat, lon], 13);
	}

	lat = mymap.getCenter().lat;
	lon = mymap.getCenter().lng;
	updateDPPopup(lat + ";" + lon);
	console.log("ADD MARKER");
	console.log("	", lat);
	console.log("	", lon);

	mymap.closePopup();

	if (userMarker != undefined) { // Remove old userMarker
		userMarker.remove();
	};

	userMarker = L.marker([lat, lon],
		{
			draggable: true,
			autoPan: true,
			icon: newMarkerIcon
		})
		.on('dragend', updateUserMarkerLocation)
		.on("click", function() {
			var id = lat + ";" + lon;
			console.log("CLICK ON MARKER ID:", id);
			updateDPPopup(id);
			showDpEditPopup();
		})
		.addTo(mymap);
		userMarker.setLatLng([lat, lon]);
}

//// ////
// marker-edit-form validation and POST
function validateMarkerEditForm() {
	lat = document.forms["markerEditForm"]["lat"].value;
	lon = document.forms["markerEditForm"]["lon"].value;
	var isNew = document.forms["markerEditForm"]["new"].value;
	var	password = document.forms["markerEditForm"]["password"].value
	var salt = generateSalt();
	var hash = $.md5(password + lat + lon) + salt;

	if (document.forms["markerEditForm"]["summary"].value == "") {
		console.log("FORM ERROR: EMPTY SUMMARY");
		alert("FORM ERROR: Empty 'summary' field");
		return false;
	}
	if (document.forms["markerEditForm"]["description"].value == "") {
		console.log("FORM ERROR: EMPTY DESCRIPTION");
		alert("FORM ERROR: Empty 'description' field");
		return false;
	}
	if (document.forms["markerEditForm"]["radius"].value == "") {
		console.log("FORM ERROR: EMPTY RADIUS");
		alert("FORM ERROR: Empty 'radius' field");
		return false;
	}

	if (document.forms["markerEditForm"]["name"].value == "") {
		console.log("FORM ERROR: EMPTY NAME");
		alert("FORM ERROR: Empty 'name' field");
		return false;
	}

	if (document.forms["markerEditForm"]["password"].value == "") {
		console.log("FORM ERROR: EMPTY PASSWORD");
		alert("FORM ERROR: Empty 'password' field");
		return false;
	}

	if (document.forms["markerEditForm"]["need"].checked) {
		var role = "infected";
	} else if (document.forms["markerEditForm"]["offer"].checked) {
		var role = "helpers";
	} else {
		alert("Valitse rooli");
		return false;
	};

	if (isNew == "true") {
		// This url creates new datapoints
		postUrl = "http://stash.pekka.pl:8080/api/" + role + ".json";
	} else {
		// This url edits
		var postUrl = "http://stash.pekka.pl:8080/api/datapoints.json?id=" + lat + ";" + lon;
	};

	console.log("VALID FORM FOR:", lat, lon);
	console.log("	IS NEW:", isNew);
	console.log("	SEND TO:", postUrl);
	console.log("	SALT:", salt);
	console.log("	HASH:", hash);

	var dpValues = {
		"role":        role,
		"new":         isNew,
		"title":       document.forms["markerEditForm"]["title"].value,
		"summary":     document.forms["markerEditForm"]["summary"].value,
		"description": document.forms["markerEditForm"]["description"].value,
		"location":    [lat, lon],
		"radius":      parseInt(document.forms["markerEditForm"]["radius"].value),
		"name":        document.forms["markerEditForm"]["name"].value,
		"passhash":    hash
	};

	console.log("POSTING:", dpValues);
	$.post(postUrl, {
		"location":    dpValues["location"],
		"role":        dpValues["role"],
		"name":        dpValues["name"],
		"summary":     dpValues["summary"],
		"description": dpValues["description"],
		"radius":      dpValues["radius"]
	}).done(function() {
		console.log("POST DONE");
		location.reload();							// TODO: reload only markers, not whole page
	});
};

function closeNewMarkerEditor() {
	console.log("MARKER EDIT: HIDE");
	$("#marker-edit-frame").hide();
};

function noLocation(error) {
	switch(error.code) {
		case error.PERMISSION_DENIED:
			console.log("NO GEOLOCATION: PERMISSION_DENIED");
			break;
		case error.POSITION_UNAVAILABLE:
			console.log("NO GEOLOCATION: POSITION_UNAVAILABLE");
			break;
		case error.TIMEOUT:
			console.log("NO GEOLOCATION: TIMEOUT");
			break;
		case error.UNKNOWN_ERROR:
			console.log("NO GEOLOCATION: UNKNOWN_ERROR");
			break;
	};
};

// 																				Add markers for all datapoints
function addMarker(i) {
	circleColors = ["rgb(255, 0, 0)", "rgb(0, 255, 0)"];
	if (i["role"] == "infected") {
		var cColor = circleColors[0];
	} else if (i["role"] == "helpers") {
		var cColor = circleColors[1];
	};

	L.circle(i["location"], {
		color:      'black',
		weight:      1,
		fillColor:   cColor,
		fillOpacity: 0.1,
		radius:      i["radius"]
	})
	.addTo(circle_group);
	L.marker(i["location"])
		.on('click', function(e) {
			popup = e.target.getPopup();
			console.log("CLICK ON: '" + i["role"] + "' MARKER");

			lat = e.target.getLatLng()["lat"].toString();
			var lata = lat.split(".")[0];
			var latb = lat.split(".")[1].substring(0, 15);	//	Limit the decimal amount
			lat = lata + "." + latb;

			lon = e.target.getLatLng()["lng"].toString();
			var lona = lon.split(".")[0];
			var lonb = lon.split(".")[1].substring(0, 15);	//	Limit the decimal amount
			lon = lona + "." + lonb;

			var id = lat + ";" + lon;
			updateDPPopup(id);
		})
		.addTo(pin_group)
		.bindPopup($('#datapoint-popup').html(),
		{ keepInView: true }
	);
	// console.log("MARKER ADDED:", i["name"]);
};

// Messaging popup show
function showMessagingPopup() {
	$("#messaging-popup-container").show();
	console.log("MESSAGING SHOW");
};

// Messaging popup hide
function hideMessagingPopup() {
	$("#messaging-popup-container").hide();
	console.log("MESSAGING: HIDE");
};

//datapoint edit popup
function showDpEditPopup() {
	console.log("MARKER EDIT: SHOW");
	$("#marker-edit-frame").show();
};

// Keep location for new marker in memory
function updateUserMarkerLocation(e) {
	lat = e.target.getLatLng()["lat"];
	lon = e.target.getLatLng()["lng"];
	$('input[name="lat"]').val(lat);
	$('input[name="lon"]').val(lon);
	updateDPPopup(lat + ";" + lon)
	console.log("TARGET FOR MARKER:", lat, lon);
};

// Populate edit form values and popup view
function updateDPPopup(id) {
	console.log("DP VIEW UPDATE:", id);
	var dbResponse = $.get( "http://stash.pekka.pl:8080/api/datapoints.json?id=" + id, function() {})
		.done(function() {
		console.log("DP VIEW UPDATE: GET RESPONSE:", dbResponse.responseJSON);
		var dp = dbResponse.responseJSON[id];
		if (dp == null) {
			lat = id.split(";")[0];
			lon = id.split(";")[1];
			console.log("NEW DATAPOINT:", lat, lon);
			$("#marker-edit-form #lat").val(lat);
			$("#marker-edit-form #lon").val(lon);
			$("#marker-edit-form #new").val("true");
			$("#marker-edit-form .role-select").prop("checked", false);
			$("#marker-edit-form .role-select").show();
			$("#marker-edit-form #name").val("");
			$("#marker-edit-form #summary").val("");
			$("#marker-edit-form #description").val("");
			$("#marker-edit-form #radius").val(1000);
			return;
		}

		console.log("UPDATING THE VIEW WITH:", dp)
		$("#marker-edit-form #new").val("false");
		if (dp["role"] == "infected") {
			$("#marker-edit-form #need").prop("checked", true);
			$("#marker-edit-form #offer").prop("checked", false);
		} else if (dp["role"] == "helpers") {
			$("#marker-edit-form #need").prop("checked", false);
			$("#marker-edit-form #offer").prop("checked", true);
		};
		$("#marker-edit-form .role-select").hide();
		$("#marker-edit-form #lat").val(dp["location"]["lat"]);
		$("#marker-edit-form #lon").val(dp["location"]["lon"]);
		$("#marker-edit-form #name").val(dp["name"]);
		$("#marker-edit-form #summary").val(dp["summary"]);
		$("#marker-edit-form #description").val(dp["description"]);
		$("#marker-edit-form #radius").val(dp["radius"]);
		$("#datapoint-popup #name").text(dp["name"]);
		$("#datapoint-popup #role").text(dp["role"]);
		$("#datapoint-popup #summary").text(dp["summary"]);
		$("#datapoint-popup #description").text(dp["description"]);
		
		if (typeof(popup) != "undefined") {
			popup.setContent($('#datapoint-popup').html());
		} else {
			console.log("ERROR: INVALID MARKER LOCATION");
			mymap.removeLayer(userMarker);
			alert("Bad location.\nTry again after moving the map a bit.");
		};
	})
	.fail(function() {
		console.log("DP VIEW UPDATE: GET FAILED FOR", id);
		$("#marker-edit-form #new").val("true");
		$("#marker-edit-form #lat").val("");
		$("#marker-edit-form #lon").val("");
		$("#marker-edit-form #description").val("");
		$("#marker-edit-form #radius").val("");
		$("#marker-edit-form #name").val("");

		$("#datapoint-popup #summary").text("Failed to get this");
		$("#datapoint-popup #name").text("ERROR");
		$("#datapoint-popup #role").text("Failed to get this");
		$("#datapoint-popup #description").text("Failed to get this");
		popup.setContent($('#datapoint-popup').html());
	});
};

/*
*/
/*
*/

// Setup map
var zoomLevel = 4;
var lat = 61;
var lon = 23.5;
var minZoom = 4;
var maxZoom = 16;

var mymap = L.map('mapid', {
		zoomControl: false,
		maxBounds: [[90, 180],[-90, -180]]
	})
	.setView([lat, lon], zoomLevel)
	.on("moveend", function() {
		latlon = mymap.getCenter();
		lat = latlon.lat;
		lon = latlon.lng;
		zoomLevel = mymap.getZoom();
		if (zoomLevel < minZoom) {
			zoomLevel = minZoom;
			mymap.setView([lat, lon], zoomLevel);
		} else if (zoomLevel > maxZoom) {
			zoomLevel =  maxZoom;
			mymap.setView([lat, lon], zoomLevel);
		};
		var url = "/koronapu/?lat=" + lat.toString().substring(0,7) + "&lon=" + lon.toString().substring(0,7) + "&z=" + zoomLevel;
		history.replaceState("", "", url);
	});


	// Center to cordinates from url. Example URL: '/koronapu/?lat=59.5&lon=24.8&z=12'
	var urlVars = getUrlVars();
	console.log("URL VARS:", urlVars.lat, urlVars.lon, urlVars.z);
	if (urlVars.lat != null && urlVars.lon != null) {
		centerToPosition([urlVars.lat, urlVars.lon, urlVars.z]);
	} else {
		// Center to users geolocation if available
		console.log(("NO URL VARS: TRYING GEOLOCATION"));
		centerToMyPosition();
	};


	L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
		minZoom:      minZoom,
		maxZoom:      maxZoom,
		id:	          'mapbox/streets-v11',
		tileSize:     512,
		zoomOffset:   -1,
		accessToken:  'pk.eyJ1IjoicGVra2FwbCIsImEiOiJjazd4ZmpoMmIwYmtrM21vMjh4bnhjMWpvIn0.CxDjgxDgvrojKDgP9fjfgA'
	})
	.addTo(mymap);

var datapoint_list_url = "http://stash.pekka.pl:8080/api/datapoints.json";
var pin_group          = new L.markerClusterGroup({singleMarkerMode: false});
var circle_group       = new L.markerClusterGroup({singleMarkerMode: false});

$(document).ready(function(e){
	$("body").scrollTop(0);
	userMarker = L.marker(mymap.getCenter());
	// setInterval(function(){ logMarkerLocation(); }, 1000); // DEBUG
});

// Fetch the list of datapoints
var response = $.getJSON( datapoint_list_url, function() {})
	.done(function() {
		for (var index in response["responseJSON"]) {
			addMarker(response["responseJSON"][index]);
		};
		mymap.addLayer(pin_group);
		mymap.addLayer(circle_group);
		console.log("DONE ADDING FROM:", datapoint_list_url);
	})
	.fail(function() {
		console.log("ERROR: CANT GET MARKERS FROM:", datapoint_list_url);
	})
