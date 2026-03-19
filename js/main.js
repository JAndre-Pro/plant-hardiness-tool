
// Determine initial zoom level based on screen width
// Used for responsive map behavior on different devices
// ------------------------------------------------------------

function getInitialZoom() {
  const w = window.innerWidth;

  if (w < 1400) return 3.2;   //small laptops
  if (w < 1800) return 3.7   // large laptops
  return 4;                  // monitors
}


//Start Mapbox map
// ------------------------------------------------------------

mapboxgl.accessToken = 'pk.eyJ1IjoiamFuZHJlLXBybyIsImEiOiJjbWxmaTFsOTIwMjY5M2VvaWIzbWgyb3F2In0.6E3iTTICdzYRJcjiQGGCMQ';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/jandre-pro/cmlwyuil3000401sm8dnye6eg', // My tile URL
  center: [-95.5795, 39.8283], // centered [lng, lat]
  zoom: getInitialZoom(), // zoom for lower 48 US
  minZoom: getInitialZoom(),
  maxZoom: 10,
  maxBounds: [[-130, 21], [-60, 53]],// sets max bounds for pan area
});

// Array to store plant data loaded from CSV
let plants = [];


// Load map + fetch data after map is ready
// ------------------------------------------------------------
map.on('load', () => {

    
    // Load plant data from CSV file
    // --------------------------------------------------------
    fetch('data/plants.csv')
        .then(response => response.text())
        .then(text => {

            const rows = text.split('\n'); // Splits CSV into rows

            // Start at 1 to skip header row
            for (let i = 1; i < rows.length; i++) {

                const values = rows[i].split(',');

                if(values.length < 3) continue; // Skips incomplete rows

                // Push plant objects into plants array
                plants.push({
                    min_temp: values[0].trim(),        // Column 0
                    scientific_name: values[1].trim(), // Column 1
                    common_name: values[2].trim()      // Column 2
                });
            }

            console.log(plants); // Debugging output
    });

    
    // Load USDA Hardiness Zone GeoJSON
    // --------------------------------------------------------
    fetch('data/phzm_us_zones_shp_2023.json')
        .then(response => response.json())
        .then(data => {

            // Add GeoJSON as a map source
            map.addSource('zones', {
                type: 'geojson',
                data: data
            });

            
            // Add colored polygon layer for each zone
            // ------------------------------------------------
            map.addLayer({
                id: 'zones-layer',
                type: 'fill',
                source: 'zones',
                paint: {
                    'fill-color': [
                        'match',
                        ['get', 'zone'],

                        // Zone Color mapping
                        '3a', '#03c2f1',
                        '3b', '#025a68',
                        '4a', '#0681f3',
                        '4b', '#045fd4',
                        '5a', '#0334b9',
                        '5b', '#0919a8',
                        '6a', '#7263f5',
                        '6b', '#fdfcfd',
                        '7a', '#b2f17e',
                        '7b', '#59f12a',
                        '8a', '#0c7022',
                        '8b', '#FED976',
                        '9a', '#faf73d',
                        '9b', '#f7ac77',
                        '10a', '#FD8D3C',
                        '10b', '#FC4E2A',
                        '11a', '#E31A1C',
                        '12a', '#BD0026',

                        '#040500' // Default color for all other data
                    ],
                    'fill-opacity': 0.4
                }
            });

            
            // Highlight layer (outline only)
            // ------------------------------------------------
            map.addLayer({
                id: 'zones-highlight',
                type: 'line',
                source: 'zones',
                paint: {
                    'line-color': '#fd0101',
                    'line-width': 1
                },
                filter: ['==','zone',''] // No zone highlighted initially
            });
        });
});


// Click event: show popup + list plants for that zone
// ------------------------------------------------------------
map.on('click', 'zones-layer', (e) => {
    // Reset previous highlight
    map.setFilter('zones-highlight', ['==','zone','']);

    const properties = e.features[0].properties;
    const clickedZone = properties.zone;

    // Highlight the clicked zone
    map.setFilter('zones-highlight', ['==','zone', clickedZone]);

    //Populate Temp range display in sidebar
    document.getElementById('trangeDisplay').textContent = properties.trange;

    // Build popup HTML
    const popupContent =
        "<p>Zone: " + properties.zone + "</p>" +
        "<p>Average Annual Extreme Winter Temperature: " +
        properties.trange + "(F)</p>";

    // Display popup on map
    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map);

    
    // Filter plants by temperature range (trange attribute)
    // --------------------------------------------------------
    const zoneRange = properties.trange;

    const matches = plants.filter(p =>
        p.min_temp === zoneRange
    );

    // Build plant list HTML
    const list = matches
        .map(p => "<li>"+p.common_name+" ("+p.scientific_name+")</li>")
        .join("");

    // Display in sidebar
    document.getElementById('plantResults').innerHTML = list;
});


// Search box: find plant → highlight its zone
// ------------------------------------------------------------
document.getElementById('plantSearchBtn').addEventListener('click', function() {

    const searchInput = document.getElementById('plantSearch')
        .value.toLowerCase().trim();

    // Find first matching plant
    const plant = plants.find(p =>
        p.common_name.toLowerCase().includes(searchInput) ||
        p.scientific_name.toLowerCase().includes(searchInput)
    );

    // No match → clear highlight + results
    if(!plant) {
        map.setFilter('zones-highlight', ['==','zone','']);
        document.getElementById('plantResults').innerHTML = '';
        return;
    }

    const minTemp = plant.min_temp;

    //Populate Temp range display in sidebar
    document.getElementById('trangeDisplay').textContent = minTemp;

    // Find zone polygon with matching temperature range
    const features = map.querySourceFeatures('zones');
    const zoneFeature = features.find(f => f.properties.trange === minTemp);

    if(!zoneFeature) return;

    const zone = zoneFeature.properties.zone;

    // Highlight the zone
    map.setFilter('zones-highlight', ['==','zone', zone]);
});


// Dropdown: highlight selected zone + list plants
// ------------------------------------------------------------
document.getElementById('zoneSelect').addEventListener('change', function(){
    map.setFilter('zones-highlight', ['==','zone','']);
    const zone = this.value;

    // Highlight selected zone
    map.setFilter('zones-highlight', ['==','zone', zone]);

    const features = map.querySourceFeatures('zones');
    const zoneFeature = features.find(f => f.properties.zone === zone);

    if(!zoneFeature) return;

    const trange = zoneFeature.properties.trange;
    
    //Populate Temp range display in sidebar
     document.getElementById('trangeDisplay').textContent = trange;

    // Filter plants by temperature range
    const matches = plants.filter(p => p.min_temp === trange);

    // Build plant list
    const list = matches
        .map(p => `<li>${p.common_name} (${p.scientific_name})</li>`)
        .join("");

    // Display in sidebar
    document.getElementById('plantResults').innerHTML = list;
});
