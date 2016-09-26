'use strict';

var weatherApp = angular.module('weatherApp', []);

weatherApp.factory('location', function ($q, $http) {

    var clientOrigin = window.location.origin;
    var lat = null;
    var long = null;
    var zipcode = null;

    return {

        getGeoCoords: function getGeoCoords() {

            return $q(function (resolve, reject) {

                if (navigator.geolocation) {

                    // if successful, resolve the promise with the position object
                    navigator.geolocation.getCurrentPosition(function (position) {
                        return resolve(position);
                    },

                    // if there's an error, reject the promise and pass the error along
                    function (error) {
                        return reject(error);
                    });
                } else {
                    return reject();
                }
            });
        },

        updateZipcode: function updateZipcode(zipcode) {
            this.zipcode = zipcode;
            return this.zipcode;
        },

        /******* Calls Google Map's API, returns location details based on geo coordinates *******/
        getGeoLocationName: function getGeoLocationName(lat, long) {

            return $http.get(clientOrigin + '/api/location/geolocation?lat=' + lat + '&long=' + long).then(function (locationData) {

                if (angular.isObject(locationData)) {
                    return locationData;
                } else {
                    return $q.reject(locationData);
                }
            });
        },

        getZipcodeLocationName: function getZipcodeLocationName(zipcode) {

            return $http.get(clientOrigin + '/api/location/zipcode?zipcode=' + zipcode).then(function (locationData) {

                if (angular.isObject(locationData)) {
                    return locationData;
                } else {
                    return $q.reject(locationData);
                }
            });
        },

        zipcode: zipcode,
        lat: lat,
        long: long
    };
});

weatherApp.factory('weatherFactory', function ($http, $q) {
    var clientOrigin = window.location.origin;
    var weatherObject = null;

    return {
        /******* Calls OpenWeatherMap's API, returns current weather data *******/
        getWeatherFromGeoCoords: function getWeatherFromGeoCoords(lat, long) {

            return $http.get(clientOrigin + '/api/weather/geocoords?lat=' + lat + '&long=' + long).then(function (weatherData) {

                if (angular.isObject(weatherData)) {
                    return weatherData;
                } else {
                    return $q.reject(weatherData);
                }
            });
        },

        getWeatherFromZipcode: function getWeatherFromZipcode(zipcode) {

            return $http.get(clientOrigin + '/api/weather/zipcode?zipcode=' + zipcode).then(function (weatherData) {

                if (angular.isObject(weatherData)) {
                    return weatherData;
                } else {
                    return $q.reject(weatherData);
                }
            });
        },

        /******* Calls OpenWeatherMap's API, returns 7 day forcast *******/
        getForecastFromGeoCoords: function getForecastFromGeoCoords(lat, long) {

            return $http.get(clientOrigin + '/api/forecast/geocoords?lat=' + lat + '&long=' + long).then(function (forecastData) {

                if (angular.isObject(forecastData)) {
                    return forecastData;
                } else {
                    return $q.reject(forecastData);
                }
            });
        },

        getForecastFromZipcode: function getForecastFromZipcode(zipcode) {

            return $http.get(clientOrigin + '/api/forecast/zipcode?zipcode=' + zipcode).then(function (forecastData) {

                if (angular.isObject(forecastData)) {
                    return forecastData;
                } else {
                    return $q.reject(forecastData);
                }
            });
        },

        initializeWeatherIcons: function initializeWeatherIcons(weatherId) {

            /******* WX Icons *******/
            var icon = "wi-na";

            var currentID = weatherId;

            // Thunderstorm
            if (currentID >= 200 && currentID <= 232) {
                icon = 'wi-day-thunderstorm';
            }

            // Drizzle
            if (currentID >= 300 && currentID <= 321) {
                icon = 'wi-day-showers';
            }

            // Rain
            if (currentID >= 500 && currentID <= 531) {
                icon = 'wi-day-rain';
            }

            // Snow
            if (currentID >= 600 && currentID <= 622) {
                icon = 'wi-day-snow';
            }

            // Atmosphere (fog, haze, etc.)
            if (currentID >= 701 && currentID <= 781) {
                icon = 'wi-day-fog';
            }

            // Sun
            if (currentID === 800 || currentID === 801) {
                icon = 'wi-day-sunny';
            }

            // Clouds
            if (currentID >= 802 && currentID <= 804) {
                icon = 'wi-day-cloudy';
            }

            return icon;
        }
    };
});

weatherApp.controller('zipcode', ['$scope', '$rootScope', 'location', function ($scope, $rootScope, location) {

    $scope.zipcodeClickHandler = function () {

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

            weatherFactory.getWeatherFromGeoCoords(location.lat, location.long).then(function (data) {

                $scope.weather = data.data;
                var weatherId = $scope.weather.weather[0].id;
                $scope.icon = weatherFactory.initializeWeatherIcons(weatherId);

                if (!data) {
                    reject();
                }

                location.getGeoLocationName(location.lat, location.long).then(function (data) {

                    $scope.location = data.data.results[5].address_components[0].long_name;
                    weatherFactory.getForecastFromGeoCoords(location.lat, location.long).then(function (data) {

                        $scope.forecast = data.data;
                        resolve(data);
                    });
                });
            });
        });
    }

    location.getGeoCoords().then(function (position) {

        location.lat = position.coords.latitude;
        location.long = position.coords.longitude;

        getGeoWeatherAndLocation().then(function () {

            $scope.hideDataFromView = false;
        }, function (error) {
            //error, show zipcode instead
        });
    }, function (error) {
        return error;
    });

    // function for the event listener
    // when a 'zipcode received' event appears,
    // this function fires.
    function getZipcodeWeatherAndLocation(zipcode) {

        return $q(function (resolve, reject) {

            weatherFactory.getWeatherFromZipcode(zipcode).then(function (data) {

                console.log('data', data);

                if (data.data.cod === '404') {
                    $scope.hideDataFromView = true;
                    $scope.zipcodeErrorMessage = true;
                    $scope.zipcode = zipcode;
                    var zipcodeError = 'ERROR: Open Weather\'s server returned a 404 status for this zipcode -> ' + zipcode;
                    console.log(zipcodeError);
                    return reject(zipcodeError);
                }

                $scope.zipcodeErrorMessage = false;
                $scope.weather = data.data;
                var weatherId = $scope.weather.weather[0].id;
                $scope.icon = weatherFactory.initializeWeatherIcons(weatherId);

                location.getZipcodeLocationName(zipcode).then(function (data) {

                    console.log('zipcode location data', data);
                    $scope.location = data.data.results[0].address_components[1].long_name;

                    weatherFactory.getForecastFromZipcode(zipcode).then(function (data) {
                        console.log('zipcode forecast data: ', data.data);
                        $scope.forecast = data.data;
                        return resolve(data);
                    });
                });
            });
        });
    }

    $scope.$on('zipcodeUpdate', function (event, zipcode) {

        getZipcodeWeatherAndLocation(zipcode).then(function () {
            $scope.hideDataFromView = false;
        });
    });
});
//# sourceMappingURL=data:application/json;base64,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Q0FBUDtBQUVILHFCQU5EO0FBT0gsaUJBYkQ7QUFjSCxhQWpDRDtBQWtDSCxTQXBDTSxDQUFQO0FBcUNIOztBQUVELFdBQU8sR0FBUCxDQUFXLGVBQVgsRUFBNEIsVUFBUyxLQUFULEVBQWdCLE9BQWhCLEVBQXlCOztBQUVqRCxxQ0FBNkIsT0FBN0IsRUFDQyxJQURELENBQ00sWUFBVztBQUNiLG1CQUFPLGdCQUFQLEdBQTBCLEtBQTFCO0FBQ0gsU0FIRDtBQUlILEtBTkQ7QUFPSCxDQTFHRCIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciB3ZWF0aGVyQXBwID0gYW5ndWxhci5tb2R1bGUoJ3dlYXRoZXJBcHAnLCBbXSk7XG5cbndlYXRoZXJBcHAuZmFjdG9yeSgnbG9jYXRpb24nLCBmdW5jdGlvbigkcSwgJGh0dHApIHtcblxuICAgIHZhciBjbGllbnRPcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgIHZhciBsYXQgPSBudWxsO1xuICAgIHZhciBsb25nID0gbnVsbDtcbiAgICB2YXIgemlwY29kZSA9IG51bGw7XG5cbiAgICByZXR1cm4ge1xuXG4gICAgICAgIGdldEdlb0Nvb3JkczogZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkcShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgICAgIGlmKG5hdmlnYXRvci5nZW9sb2NhdGlvbikge1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHByb21pc2Ugd2l0aCB0aGUgcG9zaXRpb24gb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24oZnVuY3Rpb24ocG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgXG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUncyBhbiBlcnJvciwgcmVqZWN0IHRoZSBwcm9taXNlIGFuZCBwYXNzIHRoZSBlcnJvciBhbG9uZ1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICB1cGRhdGVaaXBjb2RlOiBmdW5jdGlvbih6aXBjb2RlKSB7XG4gICAgICAgICAgICB0aGlzLnppcGNvZGUgPSB6aXBjb2RlO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuemlwY29kZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKioqKioqKiBDYWxscyBHb29nbGUgTWFwJ3MgQVBJLCByZXR1cm5zIGxvY2F0aW9uIGRldGFpbHMgYmFzZWQgb24gZ2VvIGNvb3JkaW5hdGVzICoqKioqKiovXG4gICAgICAgIGdldEdlb0xvY2F0aW9uTmFtZTogZnVuY3Rpb24obGF0LCBsb25nKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvbG9jYXRpb24vZ2VvbG9jYXRpb24/bGF0PSR7bGF0fSZsb25nPSR7bG9uZ31gKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGxvY2F0aW9uRGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzT2JqZWN0KGxvY2F0aW9uRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbkRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0gXG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KGxvY2F0aW9uRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRaaXBjb2RlTG9jYXRpb25OYW1lOiBmdW5jdGlvbih6aXBjb2RlKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvbG9jYXRpb24vemlwY29kZT96aXBjb2RlPSR7emlwY29kZX1gKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGxvY2F0aW9uRGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzT2JqZWN0KGxvY2F0aW9uRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbkRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0gXG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KGxvY2F0aW9uRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICB6aXBjb2RlOiB6aXBjb2RlLFxuICAgICAgICBsYXQ6IGxhdCxcbiAgICAgICAgbG9uZzogbG9uZ1xuICAgIH07XG59KTtcblxud2VhdGhlckFwcC5mYWN0b3J5KCd3ZWF0aGVyRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwLCAkcSkge1xuICAgIHZhciBjbGllbnRPcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgIHZhciB3ZWF0aGVyT2JqZWN0ID0gbnVsbDtcblxuICAgIHJldHVybiB7XG4gICAgICAgIC8qKioqKioqIENhbGxzIE9wZW5XZWF0aGVyTWFwJ3MgQVBJLCByZXR1cm5zIGN1cnJlbnQgd2VhdGhlciBkYXRhICoqKioqKiovXG4gICAgICAgIGdldFdlYXRoZXJGcm9tR2VvQ29vcmRzOiBmdW5jdGlvbihsYXQsIGxvbmcpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS93ZWF0aGVyL2dlb2Nvb3Jkcz9sYXQ9JHtsYXR9Jmxvbmc9JHtsb25nfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24od2VhdGhlckRhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdCh3ZWF0aGVyRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB3ZWF0aGVyRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3Qod2VhdGhlckRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0V2VhdGhlckZyb21aaXBjb2RlOiBmdW5jdGlvbih6aXBjb2RlKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvd2VhdGhlci96aXBjb2RlP3ppcGNvZGU9JHt6aXBjb2RlfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24od2VhdGhlckRhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdCh3ZWF0aGVyRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB3ZWF0aGVyRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3Qod2VhdGhlckRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqKioqKiogQ2FsbHMgT3BlbldlYXRoZXJNYXAncyBBUEksIHJldHVybnMgNyBkYXkgZm9yY2FzdCAqKioqKioqLyAgIFxuICAgICAgICBnZXRGb3JlY2FzdEZyb21HZW9Db29yZHM6IGZ1bmN0aW9uKGxhdCwgbG9uZykge1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGAke2NsaWVudE9yaWdpbn0vYXBpL2ZvcmVjYXN0L2dlb2Nvb3Jkcz9sYXQ9JHtsYXR9Jmxvbmc9JHtsb25nfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZm9yZWNhc3REYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3QoZm9yZWNhc3REYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvcmVjYXN0RGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoZm9yZWNhc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEZvcmVjYXN0RnJvbVppcGNvZGU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9mb3JlY2FzdC96aXBjb2RlP3ppcGNvZGU9JHt6aXBjb2RlfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZm9yZWNhc3REYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3QoZm9yZWNhc3REYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvcmVjYXN0RGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChmb3JlY2FzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdGlhbGl6ZVdlYXRoZXJJY29uczogZnVuY3Rpb24od2VhdGhlcklkKSB7XG5cbiAgICAgICAgICAgIC8qKioqKioqIFdYIEljb25zICoqKioqKiovXG4gICAgICAgICAgICB2YXIgaWNvbiA9IFwid2ktbmFcIjtcblxuICAgICAgICAgICAgdmFyIGN1cnJlbnRJRCA9IHdlYXRoZXJJZDtcblxuICAgICAgICAgICAgLy8gVGh1bmRlcnN0b3JtXG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSAyMDAgJiYgY3VycmVudElEIDw9IDIzMiApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS10aHVuZGVyc3Rvcm0nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEcml6emxlIFxuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gMzAwICYmIGN1cnJlbnRJRCA8PSAzMjEgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktc2hvd2Vycyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJhaW5cbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDUwMCAmJiBjdXJyZW50SUQgPD0gNTMxICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LXJhaW4nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTbm93XG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSA2MDAgJiYgY3VycmVudElEIDw9IDYyMiApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1zbm93JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXRtb3NwaGVyZSAoZm9nLCBoYXplLCBldGMuKSBcbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDcwMSAmJiBjdXJyZW50SUQgPD0gNzgxICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LWZvZyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN1blxuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPT09IDgwMCB8fCBjdXJyZW50SUQgPT09IDgwMSApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1zdW5ueSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsb3Vkc1xuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gODAyICYmIGN1cnJlbnRJRCA8PSA4MDQgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktY2xvdWR5JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGljb247XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG5cbndlYXRoZXJBcHAuY29udHJvbGxlcignemlwY29kZScsIFsnJHNjb3BlJywgJyRyb290U2NvcGUnLCAnbG9jYXRpb24nLCBmdW5jdGlvbigkc2NvcGUsICRyb290U2NvcGUsIGxvY2F0aW9uKSB7XG5cbiAgICAkc2NvcGUuemlwY29kZUNsaWNrSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIGxvY2F0aW9uLnVwZGF0ZVppcGNvZGUoJHNjb3BlLnppcGNvZGUpO1xuXG4gICAgICAgIC8vIGZpcmVzIGEgJ3ppcGNvZGUgcmVjZWl2ZWQnIGV2ZW50IHdpdGggdGhpcyAkc2NvcGUncyB6aXBjb2RlIGFzIGFzIGFyZ1xuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3ppcGNvZGVVcGRhdGUnLCAkc2NvcGUuemlwY29kZSk7XG4gICAgfTtcbn1dKTtcblxud2VhdGhlckFwcC5jb250cm9sbGVyKCd3ZWF0aGVyQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIHdlYXRoZXJGYWN0b3J5LCBsb2NhdGlvbiwgJHEpIHtcblxuICAgICRzY29wZS5oaWRlRGF0YUZyb21WaWV3ID0gdHJ1ZTtcbiAgICAkc2NvcGUuemlwY29kZUVycm9yTWVzc2FnZSA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gZ2V0R2VvV2VhdGhlckFuZExvY2F0aW9uKCkge1xuXG4gICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIHdlYXRoZXJGYWN0b3J5LmdldFdlYXRoZXJGcm9tR2VvQ29vcmRzKGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG9uZylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUud2VhdGhlciA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgd2VhdGhlcklkID0gJHNjb3BlLndlYXRoZXIud2VhdGhlclswXS5pZDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaWNvbiA9IHdlYXRoZXJGYWN0b3J5LmluaXRpYWxpemVXZWF0aGVySWNvbnMod2VhdGhlcklkKTtcblxuICAgICAgICAgICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBsb2NhdGlvbi5nZXRHZW9Mb2NhdGlvbk5hbWUobG9jYXRpb24ubGF0LCBsb2NhdGlvbi5sb25nKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9jYXRpb24gPSBkYXRhLmRhdGEucmVzdWx0c1s1XS5hZGRyZXNzX2NvbXBvbmVudHNbMF0ubG9uZ19uYW1lO1xuICAgICAgICAgICAgICAgICAgICB3ZWF0aGVyRmFjdG9yeS5nZXRGb3JlY2FzdEZyb21HZW9Db29yZHMobG9jYXRpb24ubGF0LCBsb2NhdGlvbi5sb25nKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JlY2FzdCA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGxvY2F0aW9uLmdldEdlb0Nvb3JkcygpXG4gICAgLnRoZW4oZnVuY3Rpb24ocG9zaXRpb24pIHtcblxuICAgICAgICBsb2NhdGlvbi5sYXQgPSBwb3NpdGlvbi5jb29yZHMubGF0aXR1ZGU7XG4gICAgICAgIGxvY2F0aW9uLmxvbmcgPSBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlO1xuXG4gICAgICAgIGdldEdlb1dlYXRoZXJBbmRMb2NhdGlvbigpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAkc2NvcGUuaGlkZURhdGFGcm9tVmlldyA9IGZhbHNlO1xuICAgICAgICB9LCBcblxuICAgICAgICBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAvL2Vycm9yLCBzaG93IHppcGNvZGUgaW5zdGVhZFxuICAgICAgICB9KTtcblxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgIH0pO1xuXG4gICAgLy8gZnVuY3Rpb24gZm9yIHRoZSBldmVudCBsaXN0ZW5lclxuICAgIC8vIHdoZW4gYSAnemlwY29kZSByZWNlaXZlZCcgZXZlbnQgYXBwZWFycywgXG4gICAgLy8gdGhpcyBmdW5jdGlvbiBmaXJlcy5cbiAgICBmdW5jdGlvbiBnZXRaaXBjb2RlV2VhdGhlckFuZExvY2F0aW9uKHppcGNvZGUpIHtcblxuICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICB3ZWF0aGVyRmFjdG9yeS5nZXRXZWF0aGVyRnJvbVppcGNvZGUoemlwY29kZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZGF0YScsIGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZGF0YS5jb2QgPT09ICc0MDQnKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5oaWRlRGF0YUZyb21WaWV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnppcGNvZGVFcnJvck1lc3NhZ2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuemlwY29kZSA9IHppcGNvZGU7XG4gICAgICAgICAgICAgICAgICAgIHZhciB6aXBjb2RlRXJyb3IgPSAnRVJST1I6IE9wZW4gV2VhdGhlclxcJ3Mgc2VydmVyIHJldHVybmVkIGEgNDA0IHN0YXR1cyBmb3IgdGhpcyB6aXBjb2RlIC0+ICcgKyB6aXBjb2RlO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh6aXBjb2RlRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHppcGNvZGVFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnppcGNvZGVFcnJvck1lc3NhZ2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VhdGhlciA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgd2VhdGhlcklkID0gJHNjb3BlLndlYXRoZXIud2VhdGhlclswXS5pZDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaWNvbiA9IHdlYXRoZXJGYWN0b3J5LmluaXRpYWxpemVXZWF0aGVySWNvbnMod2VhdGhlcklkKTtcblxuICAgICAgICAgICAgICAgIGxvY2F0aW9uLmdldFppcGNvZGVMb2NhdGlvbk5hbWUoemlwY29kZSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3ppcGNvZGUgbG9jYXRpb24gZGF0YScsIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9jYXRpb24gPSBkYXRhLmRhdGEucmVzdWx0c1swXS5hZGRyZXNzX2NvbXBvbmVudHNbMV0ubG9uZ19uYW1lO1xuXG4gICAgICAgICAgICAgICAgICAgIHdlYXRoZXJGYWN0b3J5LmdldEZvcmVjYXN0RnJvbVppcGNvZGUoemlwY29kZSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3ppcGNvZGUgZm9yZWNhc3QgZGF0YTogJywgZGF0YS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JlY2FzdCA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgICRzY29wZS4kb24oJ3ppcGNvZGVVcGRhdGUnLCBmdW5jdGlvbihldmVudCwgemlwY29kZSkge1xuICAgICAgICBcbiAgICAgICAgZ2V0WmlwY29kZVdlYXRoZXJBbmRMb2NhdGlvbih6aXBjb2RlKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRzY29wZS5oaWRlRGF0YUZyb21WaWV3ID0gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
