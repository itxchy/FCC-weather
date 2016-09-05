'use strict';

var weatherApp = angular.module('weatherApp', []);

weatherApp.factory('location', function($q, $http) {

    var clientOrigin = window.location.origin;
    var lat = null;
    var long = null;
    var zipcode = null;

    return {

        getGeoCoords: function() {

            return $q(function(resolve, reject) {

                if(navigator.geolocation) {

                    // if successful, resolve the promise with the position object
                    navigator.geolocation.getCurrentPosition(function(position) {
                        return resolve(position);
                    }, 

                    // if there's an error, reject the promise and pass the error along
                    function (error) {
                        return reject(error);
                    });
                } 

                else {
                    return reject();
                }
            });
        },

        updateZipcode: function(zipcode) {
            this.zipcode = zipcode;
            return this.zipcode;
        },

        /******* Calls Google Map's API, returns location details based on geo coordinates *******/
        getGeoLocationName: function(lat, long) {

            return $http.get(`${clientOrigin}/api/location/geolocation?lat=${lat}&long=${long}`)
                .then(function(locationData) {

                    if (angular.isObject(locationData)) {
                        return locationData;
                    } 

                    else {
                        return $q.reject(locationData);
                    }
                });
        },

        getZipcodeLocationName: function(zipcode) {

            return $http.get(`${clientOrigin}/api/location/zipcode?zipcode=${zipcode}`)
                .then(function(locationData) {

                    if (angular.isObject(locationData)) {
                        return locationData;
                    } 

                    else {
                        return $q.reject(locationData);
                    }
                });
        },

        zipcode: zipcode,
        lat: lat,
        long: long
    };
});

weatherApp.factory('weatherFactory', function($http, $q) {
    var clientOrigin = window.location.origin;
    var weatherObject = null;

    return {
        /******* Calls OpenWeatherMap's API, returns current weather data *******/
        getWeatherFromGeoCoords: function(lat, long) {

            return $http.get(`${clientOrigin}/api/weather/geocoords?lat=${lat}&long=${long}`)
                .then(function(weatherData) {

                    if (angular.isObject(weatherData)) {
                        return weatherData;
                    } 

                    else {
                        return $q.reject(weatherData);
                    }
                });
        },

        getWeatherFromZipcode: function(zipcode) {

            return $http.get(`${clientOrigin}/api/weather/zipcode?zipcode=${zipcode}`)
                .then(function(weatherData) {

                    if (angular.isObject(weatherData)) {
                        return weatherData;
                    } 

                    else {
                        return $q.reject(weatherData);
                    }
                });
        },

        /******* Calls OpenWeatherMap's API, returns 7 day forcast *******/   
        getForecastFromGeoCoords: function(lat, long) {

            return $http.get(`${clientOrigin}/api/forecast/geocoords?lat=${lat}&long=${long}`)
                .then(function(forecastData) {

                    if (angular.isObject(forecastData)) {
                        return forecastData;
                    } 

                    else {
                        return $q.reject(forecastData);
                    }
                });
        },

        getForecastFromZipcode: function(zipcode) {

            return $http.get(`${clientOrigin}/api/forecast/zipcode?zipcode=${zipcode}`)
                .then(function(forecastData) {

                    if (angular.isObject(forecastData)) {
                        return forecastData;
                    }

                    else {
                        return $q.reject(forecastData);
                    }
                });
        },

        initializeWeatherIcons: function(weatherId) {

            /******* WX Icons *******/
            var icon = "wi-na";

            var currentID = weatherId;

            // Thunderstorm
            if ( currentID >= 200 && currentID <= 232 ) {
                icon = 'wi-day-thunderstorm';
            }

            // Drizzle 
            if ( currentID >= 300 && currentID <= 321 ) {
                icon = 'wi-day-showers';
            }

            // Rain
            if ( currentID >= 500 && currentID <= 531 ) {
                icon = 'wi-day-rain';
            }

            // Snow
            if ( currentID >= 600 && currentID <= 622 ) {
                icon = 'wi-day-snow';
            }

            // Atmosphere (fog, haze, etc.) 
            if ( currentID >= 701 && currentID <= 781 ) {
                icon = 'wi-day-fog';
            }

            // Sun
            if ( currentID === 800 || currentID === 801 ) {
                icon = 'wi-day-sunny';
            }

            // Clouds
            if ( currentID >= 802 && currentID <= 804 ) {
                icon = 'wi-day-cloudy';
            }

            return icon;
        }
    };
});

weatherApp.controller('zipcode', ['$scope', '$rootScope', 'location', function($scope, $rootScope, location) {

    $scope.zipcodeClickHandler = function() {

        location.updateZipcode($scope.zipcode);

        // fires a 'zipcode received' event with this $scope's zipcode as as arg
        $rootScope.$broadcast('zipcodeUpdate', $scope.zipcode);
    };
}]);

weatherApp.controller('weatherCtrl', function ($scope, weatherFactory, location, $q) {

    $scope.hideDataFromView = true;
    $scope.zipcodeErrorMessage = false;

    function getGeoWeatherAndLocation() {

        return $q(function (resolve, reject) {

            weatherFactory.getWeatherFromGeoCoords(location.lat, location.long)
            .then(function (data) {

                $scope.weather = data.data;
                var weatherId = $scope.weather.weather[0].id;
                $scope.icon = weatherFactory.initializeWeatherIcons(weatherId);

                if (!data) {
                    reject();
                }

                location.getGeoLocationName(location.lat, location.long)
                .then(function(data) {

                    $scope.location = data.data.results[5].address_components[0].long_name;
                    weatherFactory.getForecastFromGeoCoords(location.lat, location.long)
                    .then(function(data) {

                        $scope.forecast = data.data;
                        resolve(data);
                    });
                });
            });
        });
    }

    location.getGeoCoords()
    .then(function(position) {

        location.lat = position.coords.latitude;
        location.long = position.coords.longitude;

        getGeoWeatherAndLocation()
        .then(function() {

            $scope.hideDataFromView = false;
        }, 

        function(error) {
        //error, show zipcode instead
        });

        }, function(error) {
            return error;
    });

    // function for the event listener
    // when a 'zipcode received' event appears, 
    // this function fires.
    function getZipcodeWeatherAndLocation(zipcode) {

        return $q(function (resolve, reject) {

            weatherFactory.getWeatherFromZipcode(zipcode)
            .then(function (data) {

                console.log('data', data);

                if (data.data.cod === '404') {
                    $scope.hideDataFromView = true;
                    $scope.zipcodeErrorMessage = true;
                    $scope.zipcode = zipcode;
                    var zipcodeError = 'ERROR: Open Weather\'s server returned a 404 status for this zipcode -> ' + zipcode;
                    console.log(zipcodeError);
                    return reject(zipcodeError);
                }

                $scope.weather = data.data;
                var weatherId = $scope.weather.weather[0].id;
                $scope.icon = weatherFactory.initializeWeatherIcons(weatherId);

                location.getZipcodeLocationName(zipcode)
                .then(function(data) {

                    console.log('zipcode location data', data);
                    $scope.location = data.data.results[0].address_components[1].long_name;

                    weatherFactory.getForecastFromZipcode(zipcode)
                    .then(function(data) {
                        console.log('zipcode forecast data: ', data.data);
                        $scope.forecast = data.data;
                        return resolve(data);

                    });
                });
            });
        });
    }

    $scope.$on('zipcodeUpdate', function(event, zipcode) {
        
        getZipcodeWeatherAndLocation(zipcode)
        .then(function() {
            $scope.hideDataFromView = false;
        });
    });
});
