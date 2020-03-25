
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

function centerToMyPosition() {
	// Center the map to users geolocation
	$.geolocation.get().done(centerToPosition).fail(noLocation);

}

var newMarkerIcon = L.icon({
    iconUrl: 'img/new-location.png',
    iconSize:     [128, 128], // size of the icon
    iconAnchor:   [65, 124], // point of the icon which will correspond to marker's location
    popupAnchor:  [0, 0] // point from which the popup should open relative to the iconAnchor
});

function userAddMarker() {	
	$.geolocation.get().done(mymap.setTo).fail(noLocation);	
	latlng = mymap.getCenter();
	lat = latlng.lat
	lng = latlng.lng
	if (mymap.getZoom() < 13) {	
		console.log("flying to", lat, lng);		
		mymap.flyTo([lat, lng], 13);
	} else {		
		console.log("flying to", lat, lng);		
		mymap.flyTo([lat, lng], 13);	
	}	
	mymap.closePopup();
	if (userMarker != undefined) {
		userMarker.remove();
		
	};
	userMarker =  L.marker([lat, lng],
		{			
			draggable: true,
            autoPan: true,
			icon: newMarkerIcon
		})
		.addTo(mymap)
		.bindPopup($('#marker-edit-frame').html(),
		//.bindPopup("<iframe class='markerEditPopup' src='html/edit-user-marker.html?lat=" + lat + "&lon=" + lng + "'></iframe><br><button onclick='closeNewMarkerEditor()' type='button'>Peruuta</button>",
			{
				maxWidth: 290, // Too big value hides the Send button on small screens
				maxHeight: 400,
				closeOnClick: false,
				keepInView: true,
			}
		)
}




//// //// 
// marker-edit-form validation and POST

function validateMarkerEditForm() {

	// TODO lat ja lon pitää ottaa markkerin sijainnista, ei map.getCenter():illä
	lat = latlng.lat;
	lon = latlng.lng;
	var	password = document.forms["markerEditForm"]["password"].value
	
	var salt = generateSalt();
	console.log("Salt generated:", salt);
	
	var hash = $.md5(password + lat + lon) + salt;
	console.log("Hash generated:", hash);
	
	if (document.forms["markerEditForm"]["title"].value == "") {
		alert("Otsikko puuttuu");
		return false;
	}
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
		var role = "helper";
	}
	
	console.log("Setting dpValues for point in", lat, lon);
	
	var hash = password; // remove when md5 works
		 
	var dpValues = {
		"role":			role,
		"title": 		document.forms["markerEditForm"]["title"].value,
		"summary": 		document.forms["markerEditForm"]["summary"].value,
		"description": 	document.forms["markerEditForm"]["description"].value,
		"location":		{ "lat": lat, "lon": lon },
		"radius": 		parseInt(document.forms["markerEditForm"]["radius"].value),
		"name": 		document.forms["markerEditForm"]["name"].value,
		"passhash": 	hash
	}
	
	console.log("Valid form. Could POST these:", dpValues);
	console.log("radius is typeof: ", typeof(dpValues["radius"]));
	
	var postUrl = "http://stash.pekka.pl:8080/api/" + role + ".json";
	console.log("PostUrl: ", postUrl);


	/*
	*/
		
	$.post(postUrl, {
		"location": [ (Math.random()-.5)*360, (Math.random()-.5)*180 ],
		"name": "apinatesti2",
		"summary": Date.now(),
		"description": "Lorem ipsum dolor sit amet",
		"radius": dpValues["radius"]
		//"radius": parseInt( Math.random() * 10 ) * 100
	}, console.log).done(function() {
        console.log("Successsss");
      });
        console.log("done");

};
// marker-edit-form validation and POST
//// //// 


function closeNewMarkerEditor() {
	console.log("close marker editor");
	mymap.closePopup();
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


// Add markers for infected users
function addAsInfectedMarker(i) {
	L.circle(i["location"], {
		color: 'black',    
		weight: 1,
		fillColor: 'rgb(255, 0, 0)',
		fillOpacity: 0.3,
		radius: i["radius"]
	})
	.addTo(mymap)
	L.marker(i["location"]).addTo(mymap)
		.bindPopup("<div class='popup'><h3>" + i['name'] + " </h3>Potilas<br><br>" + i["description"] + "<br><button onclick='showMessagingPopup()'><img src='img/chat-bubble.png' alt='Lähetä viesti'></button></div>", 
		// TODO: Kuinka saada muuttuja i:n jutut htmlään (ehkä jqueryllä päivittää otsikon ja kuvauksen yms kun popup avataan) nyt unille :)
		{ keepInView: true }
	);
	console.log("Sick Added:", i["name"]);
};


// Add markers for helpers
function addAsHelperMarker(i) {
	L.circle(i["location"], {
		color: 'black',    
		weight: 1,
		fillColor: 'rgb(0, 255, 0)',
		fillOpacity: 0.3,
		radius: i["radius"]
	}).addTo(mymap);	
	L.marker(i["location"]).addTo(mymap)
		.bindPopup("<div class='popup'><h3>" + i['name'] + " </h3>Auttaja<br><br>" + i['description'] + "<br><button onclick='showMessagingPopup()'><img src='img/chat-bubble.png' alt='Lähetä viesti'></button></div>",
		{ keepInView: true }
	);
	console.log("Helper added:", i["name"]);
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


function updateLayers() {
	var currentZoom = mymap.getZoom();
	if (currentZoom <= 12) {
		console.log("zoomlevel", currentZoom);
	} else {
		console.log("zoomlevel", currentZoom);
	};
};


/*
*/
/*
*/
/*
*/


// Setup map	
var mymap = L.map('mapid', { zoomControl: false }).setView([62.38, 22.66], 7);
	console.log("map create");
	L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
	maxZoom: 18,
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

var userMarker = null;
centerToMyPosition();
var latlng = mymap.getCenter();


$(document).ready(function(e){
	$("body").scrollTop(0);
	$('marker-edit-form').submit(function(e) {
    	console.log("tähän lähetysjuttuja");
		e.preventDefault(e);
	});
});


// Fetch the list of infected markers
var response = $.getJSON( infected_list_url, function() {})
	.done(function() {
		for (var index in response["responseJSON"]) {
    		addAsInfectedMarker(response["responseJSON"][index]);
	    };
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
		console.log("Contents of 'helpers.json' added as markers");
	})
	.fail(function() {
		console.log("Error loading markerlist:", helpers_list_url);
	});

