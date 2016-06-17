const env         = require('node-env-file');
const compression = require('compression');
const request     = require('request');
const express     = require('express');
const app         = express();

env(__dirname + '/.env');

const openWeatherApiKey = process.env.OPEN_WEATHER_API_KEY;

function externalRequest (uri, res, errorMessage) {

    request(uri, (err, apiResponse, body) => {

        if (!err && apiResponse.statusCode == 200) {
            res.send(body);
        }

        if (err) {
            res.status(500).end('Error!', err);
        }

        else {
            res.end(errorMessage, apiResponse.statusCode);
        }
    });
}

app.use(compression());

app.use('/', express.static(__dirname + '/public'));

app.get('/api/location/geocoords', (req, res) => {
    let lat = req.param('lat');
    let long = req.param('long');
    let googleGeoUri = `http://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}`;
    let errorMessage = 'ERROR: Google Maps API request for location from Geo Coords returned status code: ';

    externalRequest(googleGeoUri, res, errorMessage);

});

app.get('/api/location/zipcode', (req, res) => {
    let zipcode = req.param('zipcode');
    let googleZipcodeUri = `http://maps.googleapis.com/maps/api/geocode/json?address=${zipcode}`;
    let errorMessage = 'ERROR: Google Maps API request for location from zipcode returned status code: ';

    externalRequest(googleZipcodeUri, res, errorMessage);

});

app.get('/api/location/geolocation', (req, res) => {
    let lat = req.param('lat');
    let long = req.param('long');
    let googleGeoUri = `http://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}`;
    let errorMessage = 'ERROR: Google Maps API request for loction for geo coordinates returned status code: ';

    externalRequest(googleGeoUri, res, errorMessage);
    
});

app.get('/api/weather/geocoords', (req, res) => {
    let lat = req.param('lat');
    let long = req.param('long');
    let geoUri = `http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${long}&units=imperial&APPID=${openWeatherApiKey}`;
    let errorMessage = 'ERROR: Open Weather Map API request for current conditions from Geo Coords returned status code: ';

    externalRequest(geoUri, res, errorMessage);

});

app.get('/api/weather/zipcode', (req, res) => {
    let zipcode = req.param('zipcode');
    let zipcodeUri = `http://api.openweathermap.org/data/2.5/weather?zip=${zipcode},us&units=imperial&APPID=${openWeatherApiKey}`;
    let errorMessage = 'ERROR: Open Weather Map API request for current conditions from Zipcode returned status code: ';

    externalRequest(zipcodeUri, res, errorMessage);

}); 

app.get('/api/forecast/geocoords', (req, res) => {
    let lat = req.param('lat');
    let long = req.param('long');
    let geoForecastUri = `http://api.openweathermap.org/data/2.5/forecast/daily?lat=${lat}&lon=${long}&cnt=7&units=imperial&APPID=${openWeatherApiKey}`;
    let errorMessage = 'ERROR: Open Weather Forecast call with geo coords returned status code: ';

    externalRequest(geoForecastUri, res, errorMessage);

});

app.get('/api/forecast/zipcode', (req, res) => {
    let zipcode = req.param('zipcode');
    let zipcodeForecastUri = `http://api.openweathermap.org/data/2.5/forecast/daily?zip=${zipcode}&cnt=7&units=imperial&APPID=${openWeatherApiKey}`;
    let errorMessage = 'ERROR: Open Weather Forecast call with zipcode returned status code: ';

    externalRequest(zipcodeForecastUri, res, errorMessage);

});

app.listen(4000, () => {
    console.log('Express app listening on port 4000!');
});
