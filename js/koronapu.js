
// Extract variables from URL
// Example: var lat = getUrlVars()["lat"];
function getUrlVars() {
	var vars = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
	    vars[key] = value;
	});
	return vars;
}

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

// Map centering
function centerToPosition(position) {
	// Center the map to selected position
	mymap.flyTo([position.coords.latitude, position.coords.longitude], 12);
}

// Center the map to users geolocation
function centerToMyPosition() {
	$.geolocation.get().done(centerToPosition).fail(noLocation);
}

var newMarkerIcon = L.icon({
	iconUrl: 			'img/new-location.png',
	iconSize:     [128, 128],	// size of the icon
	iconAnchor:   [65, 124],	// point of the icon which will correspond to marker's location
	popupAnchor:  [0, 0]			// point from which the popup should open relative to the iconAnchor
});

function userAddMarker() {
	$.geolocation.get().done(mymap.setTo).fail(noLocation);
	lat = mymap.getCenter().lat;
	lng = mymap.getCenter().lng;
	console.log("ADD MARKER");
	console.log("  ", lat);
	console.log("  ", lng);

	mymap.flyTo([lat, lng], 13);
	mymap.closePopup();

	if (userMarker != undefined) {
		userMarker.remove();
	};

	userMarker = L.marker([lat, lng],
		{
			draggable: true,
			autoPan: true,
			icon: newMarkerIcon
		})
		.on('dragend', updateUserMarkerLocation)
		.on("click", function() {
			console.log("CLICK ON userMarker");
		})
		.addTo(mymap)
		.bindPopup($('#marker-edit-frame').html(),
			{
				maxWidth: 290, // Too big value hides the Send button on small screens
				maxHeight: 400,
				closeOnClick: false,
				keepInView: true,
			}
		);
		userMarker.setLatLng([lat, lng]);
}

//// ////
// marker-edit-form validation and POST
function validateMarkerEditForm() {
	lat = userMarker.getLatLng().lat;
	lon = userMarker.getLatLng().lng;
	console.log("VALIDATE MARKER INFO FOR POST:", lat, lon);

	var	password = document.forms["markerEditForm"]["password"].value
	var salt = generateSalt();
	var hash = $.md5(password + lat + lon) + salt;

	console.log("Salt:", salt);
	console.log("Hash:", hash);

	if (document.forms["markerEditForm"]["summary"].value == "") {
		alert("Lyhyt kuvaus puuttuu");
		return false;
	}
	if (document.forms["markerEditForm"]["description"].value == "") {
		alert("Tarkka kuvaus puuttuu");
		return false;
	}
	if (document.forms["markerEditForm"]["radius"].value == "") {
		alert("Etäisyys puuttuu");
		return false;
	}

	if (document.forms["markerEditForm"]["name"].value == "") {
		alert("Nimimerkki puuttuu");
		return false;
	}

	if (document.forms["markerEditForm"]["password"].value == "") {
		alert("Salasana puuttuu");
		return false;
	}

	if (document.forms["markerEditForm"]["need"].checked) {
		var role = "infected";
	} else {
		var role = "helpers";
	}

	var dpValues = {
		"role":			role,
		"title": 		document.forms["markerEditForm"]["title"].value,
		"summary": 		document.forms["markerEditForm"]["summary"].value,
		"description": 	document.forms["markerEditForm"]["description"].value,
		"location":		[lat, lon],
		"radius": 		parseInt(document.forms["markerEditForm"]["radius"].value),
		"name": 		document.forms["markerEditForm"]["name"].value,
		"passhash": 	hash
	};

	console.log("VALID FORM. POSTing these:", dpValues);
	var postUrl = "http://stash.pekka.pl:8080/api/" + role + ".json";

	$.post(postUrl, {
		"location": dpValues["location"],
		"name": dpValues["name"],
		"summary": dpValues["summary"],
		"description": dpValues["description"],
		"radius": dpValues["radius"]
	}, console.log).done(function() {
		console.log("FORM POSTED");
		location.reload();							// TODO: reload only markers, not whole page
	});
};

function closeNewMarkerEditor() {
	console.log("MARKER EDIT: CANCEL");
	$("#marker-edit-frame").hide();
	mymap.closePopup();
	mymap.removeLayer(userMarker);
	userMarker = L.marker(mymap.getCenter());
}

function noLocation(error) {
  switch(error.code) {
    case error.PERMISSION_DENIED:
      console.log("User denied the request for Geolocation.");
      break;
    case error.POSITION_UNAVAILABLE:
      console.log("Location information is unavailable.");
      break;
    case error.TIMEOUT:
      console.log("The request to get user location timed out.");
      break;
    case error.UNKNOWN_ERROR:
      console.log("An unknown error occurred.");
      break;
  }
}

// 																				Add markers for infected users
function addAsInfectedMarker(i) {
	L.circle(i["location"], {
		color: 'black',
		weight: 1,
		fillColor: 'rgb(255, 0, 0)',
		fillOpacity: 0.1,
		radius: i["radius"]
	})
	.addTo(circle_group);
	L.marker(i["location"])
		.on('click', function(e) {
			popup = e.target.getPopup();
			var lat = popup.getLatLng()["lat"].toPrecision(15);
			var lon = popup.getLatLng()["lng"].toPrecision(15);
			var id = lat + ";" + lon;
			console.log("UPDATE ID:", id)
			updateDPPopup(id);
		})
		.addTo(pin_group)
		.bindPopup($('#datapoint-popup').html(),
		{ keepInView: true }
	);
	// console.log("Sick Added:", i["name"]);
};

// 																				Add markers for helpers
function addAsHelperMarker(i) {
	L.circle(i["location"], {
		color: 'black',
		weight: 1,
		fillColor: 'rgb(0, 255, 0)',
		fillOpacity: 0.1,
		radius: i["radius"]
	}).addTo(circle_group);
	L.marker(i["location"])
			.on('click', function(e) {
				popup = e.target.getPopup();
				var lat = popup.getLatLng()["lat"].toPrecision(15);
				var lon = popup.getLatLng()["lng"].toPrecision(15);
				var id = lat + ";" + lon;
				console.log("UPDATE ID:", id)
				updateDPPopup(id);
			})
		.addTo(pin_group)
		.bindPopup($('#datapoint-popup').html(),
		{ keepInView: true }
	);
	// console.log("Helper added:", i["name"]);
};

// Messaging popup show
function showMessagingPopup() {
	$("#messaging-popup-container").show();
	console.log("Show messaging");
};

// Messaging popup hide
function hideMessagingPopup() {
	$("#messaging-popup-container").hide();
	console.log("Hide messaging");
};

//datapoint edit popup
function showDpEditPopup() {
	console.log("SHOW DP EDIT", $("#marker-edit-frame"));
	$("#marker-edit-frame").show();
};

// Keep location for new marker in memory
function updateUserMarkerLocation(e) {
	$('input[name="lat"]').val(e.target.getLatLng()["lat"]);
	$('input[name="lon"]').val(e.target.getLatLng()["lon"]);
	console.log("TARGET FOR MARKER:", e.target.getLatLng()["lat"], e.target.getLatLng()["lng"]);
};

// populate edit form values
function updateDPPopup(id) {
	console.log("VIEW UPDATE FOR DP:", id);
	// GET datapoint in this location
	$.ajax({
	    url: '/api/datapoints.json/' + id,
	    type: 'GET',
	    success: function(result) {
	        // Do something with the result
	    }
	});

	$("#marker-edit-form #summary").val("ID:" + id);
	$("#marker-edit-form #name").val("NIMI MUUTETTU");
	$("#marker-edit-form #password").val("DEFAULT PASS");

	// Change title and other datapoint info
	$("#datapoint-popup #summary").text("ID:" + id);
	$("#datapoint-popup #name").text("NIMI MUUTETTU");
	$("#datapoint-popup #role").text("ROOLI MUUTETTU");

	popup.setContent($('#datapoint-popup').html());

};

function updateLayers() {
	var currentZoom = mymap.getZoom();
	if (currentZoom <= 10) {
		// console.log("zoomlevel", currentZoom);
		mymap.removeLayer(circle_group);
	} else {
		// console.log("zoomlevel", currentZoom);
		mymap.addLayer(circle_group);
	};
};

function logMarkerLocation() { // For debug purposes. call with 'setInterval(1000, logMarkerLocation)'
		console.log("Marker.getLatLng()  :", userMarker.getLatLng()["lat"], userMarker.getLatLng()["lng"]);
};


/*
*/
/*
*/
/*
*/


// Setup map
var mymap = L.map('mapid', { zoomControl: false,}).setView([62.38, 22.66], 5);
	L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
	minZoom: 5,
	maxZoom: 14,
	id: 'mapbox/streets-v11',
	tileSize: 512,
	zoomOffset: -1,
	accessToken: 'pk.eyJ1IjoicGVra2FwbCIsImEiOiJjazd4ZmpoMmIwYmtrM21vMjh4bnhjMWpvIn0.CxDjgxDgvrojKDgP9fjfgA'
}).addTo(mymap);

mymap.on('zoomend', function (e) {
	updateLayers();
});

var helpers = [];
//var helpers_list_url = "https://kalasivut.net/koronapu/data/helpers.json";
var helpers_list_url = "http://stash.pekka.pl:8080/api/helpers.json";
var infected = [];
//var infected_list_url = "https://kalasivut.net/koronapu/data/infected.json";
var infected_list_url = "http://stash.pekka.pl:8080/api/infected.json";

var pin_group = new L.markerClusterGroup({singleMarkerMode: false});
var circle_group = new L.FeatureGroup();


$(document).ready(function(e){
	// $("#datapoint-popup").show();
	$("body").scrollTop(0);
	centerToMyPosition();
	userMarker = L.marker(mymap.getCenter());
});


// Fetch the list of infected markers
var response = $.getJSON( infected_list_url, function() {})
	.done(function() {
		for (var index in response["responseJSON"]) {
			addAsInfectedMarker(response["responseJSON"][index]);
		};
		mymap.addLayer(pin_group);
		mymap.addLayer(circle_group);
		console.log("Contents of 'infected.json' added as markers");
	})
	.fail(function() {
		console.log("Error loading markerlist:", infected_list_url);
	})


// Fetch the list of helper markers
var response2 = $.getJSON( helpers_list_url, function() {})
	.done(function() {
		for (var index in response2["responseJSON"]) {
			addAsHelperMarker(response2["responseJSON"][index]);
		};
		mymap.addLayer(pin_group);
		mymap.addLayer(circle_group);
		console.log("Contents of 'helpers.json' added as markers");
	})
	.fail(function() {
		console.log("Error loading markerlist:", helpers_list_url);
	});
