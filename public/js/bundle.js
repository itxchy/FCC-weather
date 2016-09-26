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

        getGeoCoordsFromZipcode: function getGeoCoordsFromZipcode(zipcode) {
            var self = this;

            return $q(function (resolve, reject) {
                self.getZipcodeLocationName(zipcode).then(function (data) {
                    var lat = data.data.results[0].geometry.location.lat;
                    var long = data.data.results[0].geometry.location.lng;
                    console.log('getGeoCoordsFromZipcode results: lat = ' + lat + ', long = ' + long);
                    return resolve({ lat: lat, long: long });
                });
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

weatherApp.factory('weatherFactory', function ($http, $q, location) {
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
            var self = this;
            return location.getGeoCoordsFromZipcode(zipcode).then(function (geoFromZip) {
                var lat = geoFromZip.lat;
                var long = geoFromZip.long;

                console.log('geo coords from zipcode (' + zipcode + ') to lat: ' + lat + ', long: ' + long + ', geoFromZip = ' + geoFromZip);
                return self.getWeatherFromGeoCoords(lat, long);
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

            var geoFromZip = location.getGeoCoordsFromZipcode(zipcode);
            var lat = geoFromZip.lat;
            var long = geoFromZip.long;

            return location.getForcastFromGeoCoords(lat, long);
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
                    var zipcodeError = 'ERROR : Open Weather\'s server returned a 404 status for this zipcode -> ' + zipcode;
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
                    var long = data.data.results[0].geometry.location.lng;

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
//# sourceMappingURL=data:application/json;base64,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Q29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciB3ZWF0aGVyQXBwID0gYW5ndWxhci5tb2R1bGUoJ3dlYXRoZXJBcHAnLCBbXSk7XG5cbndlYXRoZXJBcHAuZmFjdG9yeSgnbG9jYXRpb24nLCBmdW5jdGlvbigkcSwgJGh0dHApIHtcblxuICAgIHZhciBjbGllbnRPcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgIHZhciBsYXQgPSBudWxsO1xuICAgIHZhciBsb25nID0gbnVsbDtcbiAgICB2YXIgemlwY29kZSA9IG51bGw7XG5cbiAgICByZXR1cm4ge1xuXG4gICAgICAgIGdldEdlb0Nvb3JkczogZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkcShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgICAgIGlmKG5hdmlnYXRvci5nZW9sb2NhdGlvbikge1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHByb21pc2Ugd2l0aCB0aGUgcG9zaXRpb24gb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24oZnVuY3Rpb24ocG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgXG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUncyBhbiBlcnJvciwgcmVqZWN0IHRoZSBwcm9taXNlIGFuZCBwYXNzIHRoZSBlcnJvciBhbG9uZ1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRHZW9Db29yZHNGcm9tWmlwY29kZTogZnVuY3Rpb24oemlwY29kZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5nZXRaaXBjb2RlTG9jYXRpb25OYW1lKHppcGNvZGUpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF0ID0gZGF0YS5kYXRhLnJlc3VsdHNbMF0uZ2VvbWV0cnkubG9jYXRpb24ubGF0O1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9uZyA9IGRhdGEuZGF0YS5yZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uLmxuZztcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGdldEdlb0Nvb3Jkc0Zyb21aaXBjb2RlIHJlc3VsdHM6IGxhdCA9ICR7bGF0fSwgbG9uZyA9ICR7bG9uZ31gKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoe2xhdDogbGF0LCBsb25nOiBsb25nfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZVppcGNvZGU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcbiAgICAgICAgICAgIHRoaXMuemlwY29kZSA9IHppcGNvZGU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy56aXBjb2RlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKioqKioqIENhbGxzIEdvb2dsZSBNYXAncyBBUEksIHJldHVybnMgbG9jYXRpb24gZGV0YWlscyBiYXNlZCBvbiBnZW8gY29vcmRpbmF0ZXMgKioqKioqKi9cbiAgICAgICAgZ2V0R2VvTG9jYXRpb25OYW1lOiBmdW5jdGlvbihsYXQsIGxvbmcpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9sb2NhdGlvbi9nZW9sb2NhdGlvbj9sYXQ9JHtsYXR9Jmxvbmc9JHtsb25nfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24obG9jYXRpb25EYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3QobG9jYXRpb25EYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2F0aW9uRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QobG9jYXRpb25EYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFppcGNvZGVMb2NhdGlvbk5hbWU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9sb2NhdGlvbi96aXBjb2RlP3ppcGNvZGU9JHt6aXBjb2RlfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24obG9jYXRpb25EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb29nbGUgYXBpIHppcGNvZGUgcmVzdWx0czogJywgbG9jYXRpb25EYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3QobG9jYXRpb25EYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2F0aW9uRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QobG9jYXRpb25EYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHppcGNvZGU6IHppcGNvZGUsXG4gICAgICAgIGxhdDogbGF0LFxuICAgICAgICBsb25nOiBsb25nXG4gICAgfTtcbn0pO1xuXG53ZWF0aGVyQXBwLmZhY3RvcnkoJ3dlYXRoZXJGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHAsICRxLCBsb2NhdGlvbikge1xuICAgIHZhciBjbGllbnRPcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgIHZhciB3ZWF0aGVyT2JqZWN0ID0gbnVsbDtcblxuICAgIHJldHVybiB7XG4gICAgICAgIC8qKioqKioqIENhbGxzIE9wZW5XZWF0aGVyTWFwJ3MgQVBJLCByZXR1cm5zIGN1cnJlbnQgd2VhdGhlciBkYXRhICoqKioqKiovXG4gICAgICAgIGdldFdlYXRoZXJGcm9tR2VvQ29vcmRzOiBmdW5jdGlvbihsYXQsIGxvbmcpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS93ZWF0aGVyL2dlb2Nvb3Jkcz9sYXQ9JHtsYXR9Jmxvbmc9JHtsb25nfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24od2VhdGhlckRhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdCh3ZWF0aGVyRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB3ZWF0aGVyRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3Qod2VhdGhlckRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0V2VhdGhlckZyb21aaXBjb2RlOiBmdW5jdGlvbih6aXBjb2RlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICByZXR1cm4gbG9jYXRpb24uZ2V0R2VvQ29vcmRzRnJvbVppcGNvZGUoemlwY29kZSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoZ2VvRnJvbVppcCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF0ID0gZ2VvRnJvbVppcC5sYXQ7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsb25nID0gZ2VvRnJvbVppcC5sb25nOyBcblxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgZ2VvIGNvb3JkcyBmcm9tIHppcGNvZGUgKCR7emlwY29kZX0pIHRvIGxhdDogJHtsYXR9LCBsb25nOiAke2xvbmd9LCBnZW9Gcm9tWmlwID0gJHtnZW9Gcm9tWmlwfWApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5nZXRXZWF0aGVyRnJvbUdlb0Nvb3JkcyhsYXQsIGxvbmcpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKioqKioqKiBDYWxscyBPcGVuV2VhdGhlck1hcCdzIEFQSSwgcmV0dXJucyA3IGRheSBmb3JjYXN0ICoqKioqKiovICAgXG4gICAgICAgIGdldEZvcmVjYXN0RnJvbUdlb0Nvb3JkczogZnVuY3Rpb24obGF0LCBsb25nKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvZm9yZWNhc3QvZ2VvY29vcmRzP2xhdD0ke2xhdH0mbG9uZz0ke2xvbmd9YClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihmb3JlY2FzdERhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdChmb3JlY2FzdERhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9yZWNhc3REYXRhO1xuICAgICAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChmb3JlY2FzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0Rm9yZWNhc3RGcm9tWmlwY29kZTogZnVuY3Rpb24oemlwY29kZSkge1xuXG4gICAgICAgICAgICB2YXIgZ2VvRnJvbVppcCA9IGxvY2F0aW9uLmdldEdlb0Nvb3Jkc0Zyb21aaXBjb2RlKHppcGNvZGUpO1xuICAgICAgICAgICAgdmFyIGxhdCA9IGdlb0Zyb21aaXAubGF0O1xuICAgICAgICAgICAgdmFyIGxvbmcgPSBnZW9Gcm9tWmlwLmxvbmc7XG5cbiAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbi5nZXRGb3JjYXN0RnJvbUdlb0Nvb3JkcyhsYXQsIGxvbmcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGluaXRpYWxpemVXZWF0aGVySWNvbnM6IGZ1bmN0aW9uKHdlYXRoZXJJZCkge1xuXG4gICAgICAgICAgICAvKioqKioqKiBXWCBJY29ucyAqKioqKioqL1xuICAgICAgICAgICAgdmFyIGljb24gPSBcIndpLW5hXCI7XG5cbiAgICAgICAgICAgIHZhciBjdXJyZW50SUQgPSB3ZWF0aGVySWQ7XG5cbiAgICAgICAgICAgIC8vIFRodW5kZXJzdG9ybVxuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gMjAwICYmIGN1cnJlbnRJRCA8PSAyMzIgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktdGh1bmRlcnN0b3JtJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRHJpenpsZSBcbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDMwMCAmJiBjdXJyZW50SUQgPD0gMzIxICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LXNob3dlcnMnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSYWluXG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSA1MDAgJiYgY3VycmVudElEIDw9IDUzMSApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1yYWluJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU25vd1xuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gNjAwICYmIGN1cnJlbnRJRCA8PSA2MjIgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktc25vdyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEF0bW9zcGhlcmUgKGZvZywgaGF6ZSwgZXRjLikgXG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSA3MDEgJiYgY3VycmVudElEIDw9IDc4MSApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1mb2cnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdW5cbiAgICAgICAgICAgIGlmICggY3VycmVudElEID09PSA4MDAgfHwgY3VycmVudElEID09PSA4MDEgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktc3VubnknO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbG91ZHNcbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDgwMiAmJiBjdXJyZW50SUQgPD0gODA0ICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LWNsb3VkeSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBpY29uO1xuICAgICAgICB9XG4gICAgfTtcbn0pO1xuXG53ZWF0aGVyQXBwLmNvbnRyb2xsZXIoJ3ppcGNvZGUnLCBbJyRzY29wZScsICckcm9vdFNjb3BlJywgJ2xvY2F0aW9uJywgZnVuY3Rpb24oJHNjb3BlLCAkcm9vdFNjb3BlLCBsb2NhdGlvbikge1xuXG4gICAgJHNjb3BlLnppcGNvZGVDbGlja0hhbmRsZXIgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICBsb2NhdGlvbi51cGRhdGVaaXBjb2RlKCRzY29wZS56aXBjb2RlKTtcblxuICAgICAgICAvLyBmaXJlcyBhICd6aXBjb2RlIHJlY2VpdmVkJyBldmVudCB3aXRoIHRoaXMgJHNjb3BlJ3MgemlwY29kZSBhcyBhcyBhcmdcbiAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCd6aXBjb2RlVXBkYXRlJywgJHNjb3BlLnppcGNvZGUpO1xuICAgIH07XG59XSk7XG5cbndlYXRoZXJBcHAuY29udHJvbGxlcignd2VhdGhlckN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCB3ZWF0aGVyRmFjdG9yeSwgbG9jYXRpb24sICRxKSB7XG5cbiAgICAkc2NvcGUuaGlkZURhdGFGcm9tVmlldyA9IHRydWU7XG4gICAgJHNjb3BlLnppcGNvZGVFcnJvck1lc3NhZ2UgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIGdldEdlb1dlYXRoZXJBbmRMb2NhdGlvbigpIHtcblxuICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICB3ZWF0aGVyRmFjdG9yeS5nZXRXZWF0aGVyRnJvbUdlb0Nvb3Jkcyhsb2NhdGlvbi5sYXQsIGxvY2F0aW9uLmxvbmcpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLndlYXRoZXIgPSBkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIHdlYXRoZXJJZCA9ICRzY29wZS53ZWF0aGVyLndlYXRoZXJbMF0uaWQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmljb24gPSB3ZWF0aGVyRmFjdG9yeS5pbml0aWFsaXplV2VhdGhlckljb25zKHdlYXRoZXJJZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbG9jYXRpb24uZ2V0R2VvTG9jYXRpb25OYW1lKGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG9uZylcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvY2F0aW9uID0gZGF0YS5kYXRhLnJlc3VsdHNbNV0uYWRkcmVzc19jb21wb25lbnRzWzBdLmxvbmdfbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgd2VhdGhlckZhY3RvcnkuZ2V0Rm9yZWNhc3RGcm9tR2VvQ29vcmRzKGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG9uZylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZm9yZWNhc3QgPSBkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBsb2NhdGlvbi5nZXRHZW9Db29yZHMoKVxuICAgIC50aGVuKGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG5cbiAgICAgICAgbG9jYXRpb24ubGF0ID0gcG9zaXRpb24uY29vcmRzLmxhdGl0dWRlO1xuICAgICAgICBsb2NhdGlvbi5sb25nID0gcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZTtcblxuICAgICAgICBnZXRHZW9XZWF0aGVyQW5kTG9jYXRpb24oKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgJHNjb3BlLmhpZGVEYXRhRnJvbVZpZXcgPSBmYWxzZTtcbiAgICAgICAgfSwgXG5cbiAgICAgICAgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgLy9lcnJvciwgc2hvdyB6aXBjb2RlIGluc3RlYWRcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBmdW5jdGlvbiBmb3IgdGhlIGV2ZW50IGxpc3RlbmVyXG4gICAgLy8gd2hlbiBhICd6aXBjb2RlIHJlY2VpdmVkJyBldmVudCBhcHBlYXJzLCBcbiAgICAvLyB0aGlzIGZ1bmN0aW9uIGZpcmVzLlxuICAgIGZ1bmN0aW9uIGdldFppcGNvZGVXZWF0aGVyQW5kTG9jYXRpb24oemlwY29kZSkge1xuXG4gICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIHdlYXRoZXJGYWN0b3J5LmdldFdlYXRoZXJGcm9tWmlwY29kZSh6aXBjb2RlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5kYXRhLmNvZCA9PT0gJzQwNCcpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmhpZGVEYXRhRnJvbVZpZXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuemlwY29kZUVycm9yTWVzc2FnZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS56aXBjb2RlID0gemlwY29kZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHppcGNvZGVFcnJvciA9ICdFUlJPUiA6IE9wZW4gV2VhdGhlclxcJ3Mgc2VydmVyIHJldHVybmVkIGEgNDA0IHN0YXR1cyBmb3IgdGhpcyB6aXBjb2RlIC0+ICcgKyB6aXBjb2RlO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh6aXBjb2RlRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHppcGNvZGVFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnppcGNvZGVFcnJvck1lc3NhZ2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VhdGhlciA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgd2VhdGhlcklkID0gJHNjb3BlLndlYXRoZXIud2VhdGhlclswXS5pZDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaWNvbiA9IHdlYXRoZXJGYWN0b3J5LmluaXRpYWxpemVXZWF0aGVySWNvbnMod2VhdGhlcklkKTtcblxuICAgICAgICAgICAgICAgIGxvY2F0aW9uLmdldFppcGNvZGVMb2NhdGlvbk5hbWUoemlwY29kZSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3ppcGNvZGUgbG9jYXRpb24gZGF0YScsIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9jYXRpb24gPSBkYXRhLmRhdGEucmVzdWx0c1swXS5hZGRyZXNzX2NvbXBvbmVudHNbMV0ubG9uZ19uYW1lO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF0ID0gZGF0YS5kYXRhLnJlc3VsdHNbMF0uZ2VvbWV0cnkubG9jYXRpb24ubGF0O1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9uZyA9IGRhdGEuZGF0YS5yZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uLmxuZztcblxuICAgICAgICAgICAgICAgICAgICB3ZWF0aGVyRmFjdG9yeS5nZXRGb3JlY2FzdEZyb21HZW9Db29yZHMobGF0LCBsb25nKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnemlwY29kZSBmb3JlY2FzdCBkYXRhOiAnLCBkYXRhLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcmVjYXN0ID0gZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgJHNjb3BlLiRvbignemlwY29kZVVwZGF0ZScsIGZ1bmN0aW9uKGV2ZW50LCB6aXBjb2RlKSB7XG4gICAgICAgIFxuICAgICAgICBnZXRaaXBjb2RlV2VhdGhlckFuZExvY2F0aW9uKHppcGNvZGUpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVEYXRhRnJvbVZpZXcgPSBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
