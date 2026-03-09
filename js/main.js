mapboxgl.accessToken = 'pk.eyJ1IjoiamFuZHJlLXBybyIsImEiOiJjbWxmaTFsOTIwMjY5M2VvaWIzbWgyb3F2In0.6E3iTTICdzYRJcjiQGGCMQ';
const map = new mapboxgl.Map({
  container: 'map', // weird different way to call div
  style: 'mapbox://styles/jandre-pro/cmlwyuil3000401sm8dnye6eg', // My tile URL
  center: [-98.5795, 39.8283], // centered [lng, lat]
  zoom: 3.5 // zoom for lower 48 US
});

let plants = [];//new

map.on('load', () => { //have to use this to allow json fetch
///////////////////////////////////////// new

    fetch('data/plants.csv')
        .then(response => response.text())
        .then(text => {

            const rows = text.split('\n');

            for (let i = 1; i < rows.length; i++) {

                const values = rows[i].split(',');

                if(values.length < 3) continue;
                plants.push({
                    min_temp: values[0].trim(),           // column 0
                    scientific_name: values[1].trim(),    // column 1
                    common_name: values[2].trim()         // column 2
                });
            }
            console.log(plants);
    });
//////////////////////////////////////////////////
    
    fetch('data/phzm_us_zones_shp_2023.json')
        .then(response => response.json())
        .then(data => {

            map.addSource('zones', {
                type: 'geojson',
                data: data
            });

            map.addLayer({  //Poly style for my json - theres probably a better way to do this
                id: 'zones-layer',
                type: 'fill',
                source: 'zones',
                paint: {
                    'fill-color': [
                        'match',
                        ['get', 'zone'],

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

                        '#040500' // default color needed to run everything else - LAME
                    ],
                    'fill-opacity': 0.4
                }
            });
            map.addLayer({
                id: 'zones-highlight',
                // type: 'fill',
                // source: 'zones',
                // paint: {
                //     'fill-color': '#fd010177'
                // },
                //HIGHLIGHT OPTION
                type: 'line',
                source: 'zones',
                paint: {
                'line-color': '#fd0101',
                'line-width': 1
                },
                filter: ['==','zone','']
            });
        });
});       


map.on('click', 'zones-layer', (e) => { //Sets click event

    const properties = e.features[0].properties;

    const popupContent = // sets output of click event- need to incorporate color somehow
            "<p>Zone: " + properties.zone + "</p>" +
            "<p>Average Annual Extreme Winter Temperature: " + properties.trange + "(F)"+"</p>";
        
    new mapboxgl.Popup() // calls pop up resulting from click event and content
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map); //adds to map
//////////////////////////////////////////////////////////////////new
    const zoneRange = e.features[0].properties.trange;

    const matches = plants.filter(p =>
        p.min_temp === zoneRange
    );

    const list = matches
        .map(p => "<li>"+p.common_name+" ("+p.scientific_name+")</li>")
        .join("");

    document.getElementById('plantResults').innerHTML = list;
});
///////////////////////////////////////////////////////////////new

////search box

//document.getElementById('plantSearch').addEventListener('keyup', function() {
document.getElementById('plantSearchBtn').addEventListener('click', function() {

    const searchInput = document.getElementById('plantSearch').value.toLowerCase().trim();
    //const search = this.value.toLowerCase().trim();//

    // Find the first plant that matches the search
    const plant = plants.find(p =>
        p.common_name.toLowerCase().includes(searchInput) ||
        p.scientific_name.toLowerCase().includes(searchInput)
    );

    // If no plant matches, remove highlight and clear list
    if(!plant) {
        map.setFilter('zones-highlight', ['==','zone','']); // remove highlight
        document.getElementById('plantResults').innerHTML = '';
        return;
    }

    const minTemp = plant.min_temp;

    // Find the zone whose trange matches this plant's min_temp
    const features = map.querySourceFeatures('zones'); // all polygons
    const zoneFeature = features.find(f => f.properties.trange === minTemp);

    if(!zoneFeature) return; // nothing matches (safety check)

    const zone = zoneFeature.properties.zone;

    // Highlight the zone on the map
    map.setFilter('zones-highlight', ['==','zone', zone]);

    // Optionally, show all plants in that zone in the sidebar
    // const matches = plants.filter(p => p.min_temp === minTemp);
    // const list = matches.map(p => `<li>${p.common_name} (${p.scientific_name})</li>`).join('');
    // document.getElementById('plantResults').innerHTML = list;

});

// document.getElementById('plantSearch').addEventListener('keyup', function(){

//     const search = this.value.toLowerCase();

//     const plant = plants.find(p =>
//         p.common_name.toLowerCase().includes(search) ||
//         p.scientific_name.toLowerCase().includes(search)
//     );

//     if(!plant) return;

//     const range = plant.min_temp;

//     map.setFilter('zones-highlight', ['==','zone', range]);

// });


///DROPDOWN

document.getElementById('zoneSelect').addEventListener('change', function(){

    const zone = this.value;

    map.setFilter('zones-highlight', ['==','zone', zone]);

    const features = map.querySourceFeatures('zones');

    const zoneFeature = features.find(f => f.properties.zone === zone);

    if(!zoneFeature) return;

    const trange = zoneFeature.properties.trange;

    // find plants that match the temperature range
    const matches = plants.filter(p => p.min_temp === trange);

    // build the list
    const list = matches
        .map(p => `<li>${p.common_name} (${p.scientific_name})</li>`)
        .join("");

    // write to sidebar
    document.getElementById('plantResults').innerHTML = list;

});
// document.getElementById('zoneSelect').addEventListener('change', function(){

//     const range = this.value;

//     map.setFilter('zones-highlight', ['==','zone', range]);

//     const matches = plants.filter(p => p.min_temp === range);

//     const list = matches
//         .map(p => "<li>"+p.common_name+"</li>")
//         .join("");

//     document.getElementById('plantResults').innerHTML = list;

// });