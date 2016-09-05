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
//# sourceMappingURL=data:application/json;base64,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Y0gsYUFoQ0Q7QUFpQ0gsU0FuQ00sQ0FBUDtBQW9DSDs7QUFFRCxXQUFPLEdBQVAsQ0FBVyxlQUFYLEVBQTRCLFVBQVMsS0FBVCxFQUFnQixPQUFoQixFQUF5Qjs7QUFFakQscUNBQTZCLE9BQTdCLEVBQ0MsSUFERCxDQUNNLFlBQVc7QUFDYixtQkFBTyxnQkFBUCxHQUEwQixLQUExQjtBQUNILFNBSEQ7QUFJSCxLQU5EO0FBT0gsQ0F6R0QiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgd2VhdGhlckFwcCA9IGFuZ3VsYXIubW9kdWxlKCd3ZWF0aGVyQXBwJywgW10pO1xuXG53ZWF0aGVyQXBwLmZhY3RvcnkoJ2xvY2F0aW9uJywgZnVuY3Rpb24oJHEsICRodHRwKSB7XG5cbiAgICB2YXIgY2xpZW50T3JpZ2luID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbiAgICB2YXIgbGF0ID0gbnVsbDtcbiAgICB2YXIgbG9uZyA9IG51bGw7XG4gICAgdmFyIHppcGNvZGUgPSBudWxsO1xuXG4gICAgcmV0dXJuIHtcblxuICAgICAgICBnZXRHZW9Db29yZHM6IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgICAgICBpZihuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pIHtcblxuICAgICAgICAgICAgICAgICAgICAvLyBpZiBzdWNjZXNzZnVsLCByZXNvbHZlIHRoZSBwcm9taXNlIHdpdGggdGhlIHBvc2l0aW9uIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH0sIFxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHRoZXJlJ3MgYW4gZXJyb3IsIHJlamVjdCB0aGUgcHJvbWlzZSBhbmQgcGFzcyB0aGUgZXJyb3IgYWxvbmdcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlWmlwY29kZTogZnVuY3Rpb24oemlwY29kZSkge1xuICAgICAgICAgICAgdGhpcy56aXBjb2RlID0gemlwY29kZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnppcGNvZGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqKioqKiogQ2FsbHMgR29vZ2xlIE1hcCdzIEFQSSwgcmV0dXJucyBsb2NhdGlvbiBkZXRhaWxzIGJhc2VkIG9uIGdlbyBjb29yZGluYXRlcyAqKioqKioqL1xuICAgICAgICBnZXRHZW9Mb2NhdGlvbk5hbWU6IGZ1bmN0aW9uKGxhdCwgbG9uZykge1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGAke2NsaWVudE9yaWdpbn0vYXBpL2xvY2F0aW9uL2dlb2xvY2F0aW9uP2xhdD0ke2xhdH0mbG9uZz0ke2xvbmd9YClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihsb2NhdGlvbkRhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdChsb2NhdGlvbkRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbG9jYXRpb25EYXRhO1xuICAgICAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChsb2NhdGlvbkRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0WmlwY29kZUxvY2F0aW9uTmFtZTogZnVuY3Rpb24oemlwY29kZSkge1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGAke2NsaWVudE9yaWdpbn0vYXBpL2xvY2F0aW9uL3ppcGNvZGU/emlwY29kZT0ke3ppcGNvZGV9YClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihsb2NhdGlvbkRhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdChsb2NhdGlvbkRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbG9jYXRpb25EYXRhO1xuICAgICAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChsb2NhdGlvbkRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgemlwY29kZTogemlwY29kZSxcbiAgICAgICAgbGF0OiBsYXQsXG4gICAgICAgIGxvbmc6IGxvbmdcbiAgICB9O1xufSk7XG5cbndlYXRoZXJBcHAuZmFjdG9yeSgnd2VhdGhlckZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCwgJHEpIHtcbiAgICB2YXIgY2xpZW50T3JpZ2luID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbiAgICB2YXIgd2VhdGhlck9iamVjdCA9IG51bGw7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICAvKioqKioqKiBDYWxscyBPcGVuV2VhdGhlck1hcCdzIEFQSSwgcmV0dXJucyBjdXJyZW50IHdlYXRoZXIgZGF0YSAqKioqKioqL1xuICAgICAgICBnZXRXZWF0aGVyRnJvbUdlb0Nvb3JkczogZnVuY3Rpb24obGF0LCBsb25nKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvd2VhdGhlci9nZW9jb29yZHM/bGF0PSR7bGF0fSZsb25nPSR7bG9uZ31gKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHdlYXRoZXJEYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3Qod2VhdGhlckRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gd2VhdGhlckRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0gXG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHdlYXRoZXJEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFdlYXRoZXJGcm9tWmlwY29kZTogZnVuY3Rpb24oemlwY29kZSkge1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGAke2NsaWVudE9yaWdpbn0vYXBpL3dlYXRoZXIvemlwY29kZT96aXBjb2RlPSR7emlwY29kZX1gKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHdlYXRoZXJEYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3Qod2VhdGhlckRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gd2VhdGhlckRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0gXG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHdlYXRoZXJEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKioqKioqIENhbGxzIE9wZW5XZWF0aGVyTWFwJ3MgQVBJLCByZXR1cm5zIDcgZGF5IGZvcmNhc3QgKioqKioqKi8gICBcbiAgICAgICAgZ2V0Rm9yZWNhc3RGcm9tR2VvQ29vcmRzOiBmdW5jdGlvbihsYXQsIGxvbmcpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9mb3JlY2FzdC9nZW9jb29yZHM/bGF0PSR7bGF0fSZsb25nPSR7bG9uZ31gKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGZvcmVjYXN0RGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzT2JqZWN0KGZvcmVjYXN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JlY2FzdERhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0gXG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KGZvcmVjYXN0RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRGb3JlY2FzdEZyb21aaXBjb2RlOiBmdW5jdGlvbih6aXBjb2RlKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvZm9yZWNhc3QvemlwY29kZT96aXBjb2RlPSR7emlwY29kZX1gKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGZvcmVjYXN0RGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzT2JqZWN0KGZvcmVjYXN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JlY2FzdERhdGE7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoZm9yZWNhc3REYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGluaXRpYWxpemVXZWF0aGVySWNvbnM6IGZ1bmN0aW9uKHdlYXRoZXJJZCkge1xuXG4gICAgICAgICAgICAvKioqKioqKiBXWCBJY29ucyAqKioqKioqL1xuICAgICAgICAgICAgdmFyIGljb24gPSBcIndpLW5hXCI7XG5cbiAgICAgICAgICAgIHZhciBjdXJyZW50SUQgPSB3ZWF0aGVySWQ7XG5cbiAgICAgICAgICAgIC8vIFRodW5kZXJzdG9ybVxuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gMjAwICYmIGN1cnJlbnRJRCA8PSAyMzIgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktdGh1bmRlcnN0b3JtJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRHJpenpsZSBcbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDMwMCAmJiBjdXJyZW50SUQgPD0gMzIxICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LXNob3dlcnMnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSYWluXG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSA1MDAgJiYgY3VycmVudElEIDw9IDUzMSApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1yYWluJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU25vd1xuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gNjAwICYmIGN1cnJlbnRJRCA8PSA2MjIgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktc25vdyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEF0bW9zcGhlcmUgKGZvZywgaGF6ZSwgZXRjLikgXG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSA3MDEgJiYgY3VycmVudElEIDw9IDc4MSApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1mb2cnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdW5cbiAgICAgICAgICAgIGlmICggY3VycmVudElEID09PSA4MDAgfHwgY3VycmVudElEID09PSA4MDEgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktc3VubnknO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbG91ZHNcbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDgwMiAmJiBjdXJyZW50SUQgPD0gODA0ICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LWNsb3VkeSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBpY29uO1xuICAgICAgICB9XG4gICAgfTtcbn0pO1xuXG53ZWF0aGVyQXBwLmNvbnRyb2xsZXIoJ3ppcGNvZGUnLCBbJyRzY29wZScsICckcm9vdFNjb3BlJywgJ2xvY2F0aW9uJywgZnVuY3Rpb24oJHNjb3BlLCAkcm9vdFNjb3BlLCBsb2NhdGlvbikge1xuXG4gICAgJHNjb3BlLnppcGNvZGVDbGlja0hhbmRsZXIgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICBsb2NhdGlvbi51cGRhdGVaaXBjb2RlKCRzY29wZS56aXBjb2RlKTtcblxuICAgICAgICAvLyBmaXJlcyBhICd6aXBjb2RlIHJlY2VpdmVkJyBldmVudCB3aXRoIHRoaXMgJHNjb3BlJ3MgemlwY29kZSBhcyBhcyBhcmdcbiAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCd6aXBjb2RlVXBkYXRlJywgJHNjb3BlLnppcGNvZGUpO1xuICAgIH07XG59XSk7XG5cbndlYXRoZXJBcHAuY29udHJvbGxlcignd2VhdGhlckN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCB3ZWF0aGVyRmFjdG9yeSwgbG9jYXRpb24sICRxKSB7XG5cbiAgICAkc2NvcGUuaGlkZURhdGFGcm9tVmlldyA9IHRydWU7XG4gICAgJHNjb3BlLnppcGNvZGVFcnJvck1lc3NhZ2UgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIGdldEdlb1dlYXRoZXJBbmRMb2NhdGlvbigpIHtcblxuICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICB3ZWF0aGVyRmFjdG9yeS5nZXRXZWF0aGVyRnJvbUdlb0Nvb3Jkcyhsb2NhdGlvbi5sYXQsIGxvY2F0aW9uLmxvbmcpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLndlYXRoZXIgPSBkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIHdlYXRoZXJJZCA9ICRzY29wZS53ZWF0aGVyLndlYXRoZXJbMF0uaWQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmljb24gPSB3ZWF0aGVyRmFjdG9yeS5pbml0aWFsaXplV2VhdGhlckljb25zKHdlYXRoZXJJZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbG9jYXRpb24uZ2V0R2VvTG9jYXRpb25OYW1lKGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG9uZylcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvY2F0aW9uID0gZGF0YS5kYXRhLnJlc3VsdHNbNV0uYWRkcmVzc19jb21wb25lbnRzWzBdLmxvbmdfbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgd2VhdGhlckZhY3RvcnkuZ2V0Rm9yZWNhc3RGcm9tR2VvQ29vcmRzKGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG9uZylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZm9yZWNhc3QgPSBkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBsb2NhdGlvbi5nZXRHZW9Db29yZHMoKVxuICAgIC50aGVuKGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG5cbiAgICAgICAgbG9jYXRpb24ubGF0ID0gcG9zaXRpb24uY29vcmRzLmxhdGl0dWRlO1xuICAgICAgICBsb2NhdGlvbi5sb25nID0gcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZTtcblxuICAgICAgICBnZXRHZW9XZWF0aGVyQW5kTG9jYXRpb24oKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgJHNjb3BlLmhpZGVEYXRhRnJvbVZpZXcgPSBmYWxzZTtcbiAgICAgICAgfSwgXG5cbiAgICAgICAgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgLy9lcnJvciwgc2hvdyB6aXBjb2RlIGluc3RlYWRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICB9KTtcblxuICAgIC8vIGZ1bmN0aW9uIGZvciB0aGUgZXZlbnQgbGlzdGVuZXJcbiAgICAvLyB3aGVuIGEgJ3ppcGNvZGUgcmVjZWl2ZWQnIGV2ZW50IGFwcGVhcnMsIFxuICAgIC8vIHRoaXMgZnVuY3Rpb24gZmlyZXMuXG4gICAgZnVuY3Rpb24gZ2V0WmlwY29kZVdlYXRoZXJBbmRMb2NhdGlvbih6aXBjb2RlKSB7XG5cbiAgICAgICAgcmV0dXJuICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgd2VhdGhlckZhY3RvcnkuZ2V0V2VhdGhlckZyb21aaXBjb2RlKHppcGNvZGUpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKTtcblxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmRhdGEuY29kID09PSAnNDA0Jykge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaGlkZURhdGFGcm9tVmlldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS56aXBjb2RlRXJyb3JNZXNzYWdlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnppcGNvZGUgPSB6aXBjb2RlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgemlwY29kZUVycm9yID0gJ0VSUk9SOiBPcGVuIFdlYXRoZXJcXCdzIHNlcnZlciByZXR1cm5lZCBhIDQwNCBzdGF0dXMgZm9yIHRoaXMgemlwY29kZSAtPiAnICsgemlwY29kZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coemlwY29kZUVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdCh6aXBjb2RlRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRzY29wZS53ZWF0aGVyID0gZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgIHZhciB3ZWF0aGVySWQgPSAkc2NvcGUud2VhdGhlci53ZWF0aGVyWzBdLmlkO1xuICAgICAgICAgICAgICAgICRzY29wZS5pY29uID0gd2VhdGhlckZhY3RvcnkuaW5pdGlhbGl6ZVdlYXRoZXJJY29ucyh3ZWF0aGVySWQpO1xuXG4gICAgICAgICAgICAgICAgbG9jYXRpb24uZ2V0WmlwY29kZUxvY2F0aW9uTmFtZSh6aXBjb2RlKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnemlwY29kZSBsb2NhdGlvbiBkYXRhJywgZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5sb2NhdGlvbiA9IGRhdGEuZGF0YS5yZXN1bHRzWzBdLmFkZHJlc3NfY29tcG9uZW50c1sxXS5sb25nX25hbWU7XG5cbiAgICAgICAgICAgICAgICAgICAgd2VhdGhlckZhY3RvcnkuZ2V0Rm9yZWNhc3RGcm9tWmlwY29kZSh6aXBjb2RlKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnemlwY29kZSBmb3JlY2FzdCBkYXRhOiAnLCBkYXRhLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcmVjYXN0ID0gZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgJHNjb3BlLiRvbignemlwY29kZVVwZGF0ZScsIGZ1bmN0aW9uKGV2ZW50LCB6aXBjb2RlKSB7XG4gICAgICAgIFxuICAgICAgICBnZXRaaXBjb2RlV2VhdGhlckFuZExvY2F0aW9uKHppcGNvZGUpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVEYXRhRnJvbVZpZXcgPSBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
