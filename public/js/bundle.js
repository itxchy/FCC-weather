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
                console.log('google api zipcode results: ', locationData);
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
                    var lat = data.data.results[0].geometry.location.lat;
                    var long = data.data.result[0].geometry.location.lng;

                    weatherFactory.getForecastFromGeoCoords(lat, long).then(function (data) {
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
//# sourceMappingURL=data:application/json;base64,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QUFpQixDQUFqQixFQUFvQixRQUFwQixDQUE2QixRQUE3QixDQUFzQyxHQUFqRDs7QUFFQSxtQ0FBZSx3QkFBZixDQUF3QyxHQUF4QyxFQUE2QyxJQUE3QyxFQUNDLElBREQsQ0FDTSxVQUFTLElBQVQsRUFBZTtBQUNqQixnQ0FBUSxHQUFSLENBQVkseUJBQVosRUFBdUMsS0FBSyxJQUE1QztBQUNBLCtCQUFPLFFBQVAsR0FBa0IsS0FBSyxJQUF2QjtBQUNBLCtCQUFPLFFBQVEsSUFBUixDQUFQO0FBRUgscUJBTkQ7QUFPSCxpQkFmRDtBQWdCSCxhQW5DRDtBQW9DSCxTQXRDTSxDQUFQO0FBdUNIOztBQUVELFdBQU8sR0FBUCxDQUFXLGVBQVgsRUFBNEIsVUFBUyxLQUFULEVBQWdCLE9BQWhCLEVBQXlCOztBQUVqRCxxQ0FBNkIsT0FBN0IsRUFDQyxJQURELENBQ00sWUFBVztBQUNiLG1CQUFPLGdCQUFQLEdBQTBCLEtBQTFCO0FBQ0gsU0FIRDtBQUlILEtBTkQ7QUFPSCxDQTVHRCIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciB3ZWF0aGVyQXBwID0gYW5ndWxhci5tb2R1bGUoJ3dlYXRoZXJBcHAnLCBbXSk7XG5cbndlYXRoZXJBcHAuZmFjdG9yeSgnbG9jYXRpb24nLCBmdW5jdGlvbigkcSwgJGh0dHApIHtcblxuICAgIHZhciBjbGllbnRPcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgIHZhciBsYXQgPSBudWxsO1xuICAgIHZhciBsb25nID0gbnVsbDtcbiAgICB2YXIgemlwY29kZSA9IG51bGw7XG5cbiAgICByZXR1cm4ge1xuXG4gICAgICAgIGdldEdlb0Nvb3JkczogZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkcShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgICAgIGlmKG5hdmlnYXRvci5nZW9sb2NhdGlvbikge1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHByb21pc2Ugd2l0aCB0aGUgcG9zaXRpb24gb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24oZnVuY3Rpb24ocG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgXG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUncyBhbiBlcnJvciwgcmVqZWN0IHRoZSBwcm9taXNlIGFuZCBwYXNzIHRoZSBlcnJvciBhbG9uZ1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICB1cGRhdGVaaXBjb2RlOiBmdW5jdGlvbih6aXBjb2RlKSB7XG4gICAgICAgICAgICB0aGlzLnppcGNvZGUgPSB6aXBjb2RlO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuemlwY29kZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKioqKioqKiBDYWxscyBHb29nbGUgTWFwJ3MgQVBJLCByZXR1cm5zIGxvY2F0aW9uIGRldGFpbHMgYmFzZWQgb24gZ2VvIGNvb3JkaW5hdGVzICoqKioqKiovXG4gICAgICAgIGdldEdlb0xvY2F0aW9uTmFtZTogZnVuY3Rpb24obGF0LCBsb25nKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvbG9jYXRpb24vZ2VvbG9jYXRpb24/bGF0PSR7bGF0fSZsb25nPSR7bG9uZ31gKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGxvY2F0aW9uRGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzT2JqZWN0KGxvY2F0aW9uRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbkRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0gXG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KGxvY2F0aW9uRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRaaXBjb2RlTG9jYXRpb25OYW1lOiBmdW5jdGlvbih6aXBjb2RlKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvbG9jYXRpb24vemlwY29kZT96aXBjb2RlPSR7emlwY29kZX1gKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGxvY2F0aW9uRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZ29vZ2xlIGFwaSB6aXBjb2RlIHJlc3VsdHM6ICcsIGxvY2F0aW9uRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzT2JqZWN0KGxvY2F0aW9uRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbkRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0gXG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KGxvY2F0aW9uRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICB6aXBjb2RlOiB6aXBjb2RlLFxuICAgICAgICBsYXQ6IGxhdCxcbiAgICAgICAgbG9uZzogbG9uZ1xuICAgIH07XG59KTtcblxud2VhdGhlckFwcC5mYWN0b3J5KCd3ZWF0aGVyRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwLCAkcSkge1xuICAgIHZhciBjbGllbnRPcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgIHZhciB3ZWF0aGVyT2JqZWN0ID0gbnVsbDtcblxuICAgIHJldHVybiB7XG4gICAgICAgIC8qKioqKioqIENhbGxzIE9wZW5XZWF0aGVyTWFwJ3MgQVBJLCByZXR1cm5zIGN1cnJlbnQgd2VhdGhlciBkYXRhICoqKioqKiovXG4gICAgICAgIGdldFdlYXRoZXJGcm9tR2VvQ29vcmRzOiBmdW5jdGlvbihsYXQsIGxvbmcpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS93ZWF0aGVyL2dlb2Nvb3Jkcz9sYXQ9JHtsYXR9Jmxvbmc9JHtsb25nfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24od2VhdGhlckRhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdCh3ZWF0aGVyRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB3ZWF0aGVyRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3Qod2VhdGhlckRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0V2VhdGhlckZyb21aaXBjb2RlOiBmdW5jdGlvbih6aXBjb2RlKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvd2VhdGhlci96aXBjb2RlP3ppcGNvZGU9JHt6aXBjb2RlfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24od2VhdGhlckRhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdCh3ZWF0aGVyRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB3ZWF0aGVyRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3Qod2VhdGhlckRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqKioqKiogQ2FsbHMgT3BlbldlYXRoZXJNYXAncyBBUEksIHJldHVybnMgNyBkYXkgZm9yY2FzdCAqKioqKioqLyAgIFxuICAgICAgICBnZXRGb3JlY2FzdEZyb21HZW9Db29yZHM6IGZ1bmN0aW9uKGxhdCwgbG9uZykge1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGAke2NsaWVudE9yaWdpbn0vYXBpL2ZvcmVjYXN0L2dlb2Nvb3Jkcz9sYXQ9JHtsYXR9Jmxvbmc9JHtsb25nfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZm9yZWNhc3REYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3QoZm9yZWNhc3REYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvcmVjYXN0RGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoZm9yZWNhc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEZvcmVjYXN0RnJvbVppcGNvZGU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9mb3JlY2FzdC96aXBjb2RlP3ppcGNvZGU9JHt6aXBjb2RlfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZm9yZWNhc3REYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3QoZm9yZWNhc3REYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvcmVjYXN0RGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChmb3JlY2FzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdGlhbGl6ZVdlYXRoZXJJY29uczogZnVuY3Rpb24od2VhdGhlcklkKSB7XG5cbiAgICAgICAgICAgIC8qKioqKioqIFdYIEljb25zICoqKioqKiovXG4gICAgICAgICAgICB2YXIgaWNvbiA9IFwid2ktbmFcIjtcblxuICAgICAgICAgICAgdmFyIGN1cnJlbnRJRCA9IHdlYXRoZXJJZDtcblxuICAgICAgICAgICAgLy8gVGh1bmRlcnN0b3JtXG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSAyMDAgJiYgY3VycmVudElEIDw9IDIzMiApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS10aHVuZGVyc3Rvcm0nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEcml6emxlIFxuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gMzAwICYmIGN1cnJlbnRJRCA8PSAzMjEgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktc2hvd2Vycyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJhaW5cbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDUwMCAmJiBjdXJyZW50SUQgPD0gNTMxICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LXJhaW4nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTbm93XG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSA2MDAgJiYgY3VycmVudElEIDw9IDYyMiApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1zbm93JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXRtb3NwaGVyZSAoZm9nLCBoYXplLCBldGMuKSBcbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDcwMSAmJiBjdXJyZW50SUQgPD0gNzgxICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LWZvZyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN1blxuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPT09IDgwMCB8fCBjdXJyZW50SUQgPT09IDgwMSApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1zdW5ueSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsb3Vkc1xuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gODAyICYmIGN1cnJlbnRJRCA8PSA4MDQgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktY2xvdWR5JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGljb247XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG5cbndlYXRoZXJBcHAuY29udHJvbGxlcignemlwY29kZScsIFsnJHNjb3BlJywgJyRyb290U2NvcGUnLCAnbG9jYXRpb24nLCBmdW5jdGlvbigkc2NvcGUsICRyb290U2NvcGUsIGxvY2F0aW9uKSB7XG5cbiAgICAkc2NvcGUuemlwY29kZUNsaWNrSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIGxvY2F0aW9uLnVwZGF0ZVppcGNvZGUoJHNjb3BlLnppcGNvZGUpO1xuXG4gICAgICAgIC8vIGZpcmVzIGEgJ3ppcGNvZGUgcmVjZWl2ZWQnIGV2ZW50IHdpdGggdGhpcyAkc2NvcGUncyB6aXBjb2RlIGFzIGFzIGFyZ1xuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3ppcGNvZGVVcGRhdGUnLCAkc2NvcGUuemlwY29kZSk7XG4gICAgfTtcbn1dKTtcblxud2VhdGhlckFwcC5jb250cm9sbGVyKCd3ZWF0aGVyQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIHdlYXRoZXJGYWN0b3J5LCBsb2NhdGlvbiwgJHEpIHtcblxuICAgICRzY29wZS5oaWRlRGF0YUZyb21WaWV3ID0gdHJ1ZTtcbiAgICAkc2NvcGUuemlwY29kZUVycm9yTWVzc2FnZSA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gZ2V0R2VvV2VhdGhlckFuZExvY2F0aW9uKCkge1xuXG4gICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIHdlYXRoZXJGYWN0b3J5LmdldFdlYXRoZXJGcm9tR2VvQ29vcmRzKGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG9uZylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUud2VhdGhlciA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgd2VhdGhlcklkID0gJHNjb3BlLndlYXRoZXIud2VhdGhlclswXS5pZDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaWNvbiA9IHdlYXRoZXJGYWN0b3J5LmluaXRpYWxpemVXZWF0aGVySWNvbnMod2VhdGhlcklkKTtcblxuICAgICAgICAgICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBsb2NhdGlvbi5nZXRHZW9Mb2NhdGlvbk5hbWUobG9jYXRpb24ubGF0LCBsb2NhdGlvbi5sb25nKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9jYXRpb24gPSBkYXRhLmRhdGEucmVzdWx0c1s1XS5hZGRyZXNzX2NvbXBvbmVudHNbMF0ubG9uZ19uYW1lO1xuICAgICAgICAgICAgICAgICAgICB3ZWF0aGVyRmFjdG9yeS5nZXRGb3JlY2FzdEZyb21HZW9Db29yZHMobG9jYXRpb24ubGF0LCBsb2NhdGlvbi5sb25nKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JlY2FzdCA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGxvY2F0aW9uLmdldEdlb0Nvb3JkcygpXG4gICAgLnRoZW4oZnVuY3Rpb24ocG9zaXRpb24pIHtcblxuICAgICAgICBsb2NhdGlvbi5sYXQgPSBwb3NpdGlvbi5jb29yZHMubGF0aXR1ZGU7XG4gICAgICAgIGxvY2F0aW9uLmxvbmcgPSBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlO1xuXG4gICAgICAgIGdldEdlb1dlYXRoZXJBbmRMb2NhdGlvbigpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAkc2NvcGUuaGlkZURhdGFGcm9tVmlldyA9IGZhbHNlO1xuICAgICAgICB9LCBcblxuICAgICAgICBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAvL2Vycm9yLCBzaG93IHppcGNvZGUgaW5zdGVhZFxuICAgICAgICB9KTtcblxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgIH0pO1xuXG4gICAgLy8gZnVuY3Rpb24gZm9yIHRoZSBldmVudCBsaXN0ZW5lclxuICAgIC8vIHdoZW4gYSAnemlwY29kZSByZWNlaXZlZCcgZXZlbnQgYXBwZWFycywgXG4gICAgLy8gdGhpcyBmdW5jdGlvbiBmaXJlcy5cbiAgICBmdW5jdGlvbiBnZXRaaXBjb2RlV2VhdGhlckFuZExvY2F0aW9uKHppcGNvZGUpIHtcblxuICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICB3ZWF0aGVyRmFjdG9yeS5nZXRXZWF0aGVyRnJvbVppcGNvZGUoemlwY29kZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZGF0YScsIGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZGF0YS5jb2QgPT09ICc0MDQnKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5oaWRlRGF0YUZyb21WaWV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnppcGNvZGVFcnJvck1lc3NhZ2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuemlwY29kZSA9IHppcGNvZGU7XG4gICAgICAgICAgICAgICAgICAgIHZhciB6aXBjb2RlRXJyb3IgPSAnRVJST1I6IE9wZW4gV2VhdGhlclxcJ3Mgc2VydmVyIHJldHVybmVkIGEgNDA0IHN0YXR1cyBmb3IgdGhpcyB6aXBjb2RlIC0+ICcgKyB6aXBjb2RlO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh6aXBjb2RlRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHppcGNvZGVFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnppcGNvZGVFcnJvck1lc3NhZ2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VhdGhlciA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgd2VhdGhlcklkID0gJHNjb3BlLndlYXRoZXIud2VhdGhlclswXS5pZDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaWNvbiA9IHdlYXRoZXJGYWN0b3J5LmluaXRpYWxpemVXZWF0aGVySWNvbnMod2VhdGhlcklkKTtcblxuICAgICAgICAgICAgICAgIGxvY2F0aW9uLmdldFppcGNvZGVMb2NhdGlvbk5hbWUoemlwY29kZSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3ppcGNvZGUgbG9jYXRpb24gZGF0YScsIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9jYXRpb24gPSBkYXRhLmRhdGEucmVzdWx0c1swXS5hZGRyZXNzX2NvbXBvbmVudHNbMV0ubG9uZ19uYW1lO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF0ID0gZGF0YS5kYXRhLnJlc3VsdHNbMF0uZ2VvbWV0cnkubG9jYXRpb24ubGF0O1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9uZyA9IGRhdGEuZGF0YS5yZXN1bHRbMF0uZ2VvbWV0cnkubG9jYXRpb24ubG5nO1xuXG4gICAgICAgICAgICAgICAgICAgIHdlYXRoZXJGYWN0b3J5LmdldEZvcmVjYXN0RnJvbUdlb0Nvb3JkcyhsYXQsIGxvbmcpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd6aXBjb2RlIGZvcmVjYXN0IGRhdGE6ICcsIGRhdGEuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZm9yZWNhc3QgPSBkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShkYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAkc2NvcGUuJG9uKCd6aXBjb2RlVXBkYXRlJywgZnVuY3Rpb24oZXZlbnQsIHppcGNvZGUpIHtcbiAgICAgICAgXG4gICAgICAgIGdldFppcGNvZGVXZWF0aGVyQW5kTG9jYXRpb24oemlwY29kZSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc2NvcGUuaGlkZURhdGFGcm9tVmlldyA9IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
