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
                console.log(lat, long, 'weatherData', weatherData);
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
                console.log('$scope.weather', $scope.weather);
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
//# sourceMappingURL=data:application/json;base64,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QyxJQURELENBQ00sWUFBVztBQUNiLG1CQUFPLGdCQUFQLEdBQTBCLEtBQTFCO0FBQ0gsU0FIRDtBQUlILEtBTkQ7QUFPSCxDQTFHRCIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciB3ZWF0aGVyQXBwID0gYW5ndWxhci5tb2R1bGUoJ3dlYXRoZXJBcHAnLCBbXSk7XG5cbndlYXRoZXJBcHAuZmFjdG9yeSgnbG9jYXRpb24nLCBmdW5jdGlvbigkcSwgJGh0dHApIHtcblxuICAgIHZhciBjbGllbnRPcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgIHZhciBsYXQgPSBudWxsO1xuICAgIHZhciBsb25nID0gbnVsbDtcbiAgICB2YXIgemlwY29kZSA9IG51bGw7XG5cbiAgICByZXR1cm4ge1xuXG4gICAgICAgIGdldEdlb0Nvb3JkczogZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkcShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgICAgIGlmKG5hdmlnYXRvci5nZW9sb2NhdGlvbikge1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHByb21pc2Ugd2l0aCB0aGUgcG9zaXRpb24gb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24oZnVuY3Rpb24ocG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgXG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUncyBhbiBlcnJvciwgcmVqZWN0IHRoZSBwcm9taXNlIGFuZCBwYXNzIHRoZSBlcnJvciBhbG9uZ1xuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRHZW9Db29yZHNGcm9tWmlwY29kZTogZnVuY3Rpb24oemlwY29kZSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5nZXRaaXBjb2RlTG9jYXRpb25OYW1lKHppcGNvZGUpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF0ID0gZGF0YS5kYXRhLnJlc3VsdHNbMF0uZ2VvbWV0cnkubG9jYXRpb24ubGF0O1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9uZyA9IGRhdGEuZGF0YS5yZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uLmxuZztcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGdldEdlb0Nvb3Jkc0Zyb21aaXBjb2RlIHJlc3VsdHM6IGxhdCA9ICR7bGF0fSwgbG9uZyA9ICR7bG9uZ31gKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoe2xhdDogbGF0LCBsb25nOiBsb25nfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZVppcGNvZGU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcbiAgICAgICAgICAgIHRoaXMuemlwY29kZSA9IHppcGNvZGU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy56aXBjb2RlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKioqKioqIENhbGxzIEdvb2dsZSBNYXAncyBBUEksIHJldHVybnMgbG9jYXRpb24gZGV0YWlscyBiYXNlZCBvbiBnZW8gY29vcmRpbmF0ZXMgKioqKioqKi9cbiAgICAgICAgZ2V0R2VvTG9jYXRpb25OYW1lOiBmdW5jdGlvbihsYXQsIGxvbmcpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9sb2NhdGlvbi9nZW9sb2NhdGlvbj9sYXQ9JHtsYXR9Jmxvbmc9JHtsb25nfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24obG9jYXRpb25EYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3QobG9jYXRpb25EYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2F0aW9uRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QobG9jYXRpb25EYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFppcGNvZGVMb2NhdGlvbk5hbWU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9sb2NhdGlvbi96aXBjb2RlP3ppcGNvZGU9JHt6aXBjb2RlfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24obG9jYXRpb25EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnb29nbGUgYXBpIHppcGNvZGUgcmVzdWx0czogJywgbG9jYXRpb25EYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3QobG9jYXRpb25EYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2F0aW9uRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QobG9jYXRpb25EYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHppcGNvZGU6IHppcGNvZGUsXG4gICAgICAgIGxhdDogbGF0LFxuICAgICAgICBsb25nOiBsb25nXG4gICAgfTtcbn0pO1xuXG53ZWF0aGVyQXBwLmZhY3RvcnkoJ3dlYXRoZXJGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHAsICRxLCBsb2NhdGlvbikge1xuICAgIHZhciBjbGllbnRPcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgIHZhciB3ZWF0aGVyT2JqZWN0ID0gbnVsbDtcblxuICAgIHJldHVybiB7XG4gICAgICAgIC8qKioqKioqIENhbGxzIE9wZW5XZWF0aGVyTWFwJ3MgQVBJLCByZXR1cm5zIGN1cnJlbnQgd2VhdGhlciBkYXRhICoqKioqKiovXG4gICAgICAgIGdldFdlYXRoZXJGcm9tR2VvQ29vcmRzOiBmdW5jdGlvbihsYXQsIGxvbmcpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS93ZWF0aGVyL2dlb2Nvb3Jkcz9sYXQ9JHtsYXR9Jmxvbmc9JHtsb25nfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24od2VhdGhlckRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cobGF0LCBsb25nLCAnd2VhdGhlckRhdGEnLCB3ZWF0aGVyRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzT2JqZWN0KHdlYXRoZXJEYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdlYXRoZXJEYXRhO1xuICAgICAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh3ZWF0aGVyRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRXZWF0aGVyRnJvbVppcGNvZGU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbi5nZXRHZW9Db29yZHNGcm9tWmlwY29kZSh6aXBjb2RlKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChnZW9Gcm9tWmlwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsYXQgPSBnZW9Gcm9tWmlwLmxhdDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvbmcgPSBnZW9Gcm9tWmlwLmxvbmc7IFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBnZW8gY29vcmRzIGZyb20gemlwY29kZSAoJHt6aXBjb2RlfSkgdG8gbGF0OiAke2xhdH0sIGxvbmc6ICR7bG9uZ30sIGdlb0Zyb21aaXAgPSAke2dlb0Zyb21aaXB9YCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLmdldFdlYXRoZXJGcm9tR2VvQ29vcmRzKGxhdCwgbG9uZyk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKioqKioqIENhbGxzIE9wZW5XZWF0aGVyTWFwJ3MgQVBJLCByZXR1cm5zIDcgZGF5IGZvcmNhc3QgKioqKioqKi8gICBcbiAgICAgICAgZ2V0Rm9yZWNhc3RGcm9tR2VvQ29vcmRzOiBmdW5jdGlvbihsYXQsIGxvbmcpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9mb3JlY2FzdC9nZW9jb29yZHM/bGF0PSR7bGF0fSZsb25nPSR7bG9uZ31gKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGZvcmVjYXN0RGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzT2JqZWN0KGZvcmVjYXN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JlY2FzdERhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0gXG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KGZvcmVjYXN0RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRGb3JlY2FzdEZyb21aaXBjb2RlOiBmdW5jdGlvbih6aXBjb2RlKSB7XG5cbiAgICAgICAgICAgIHZhciBnZW9Gcm9tWmlwID0gbG9jYXRpb24uZ2V0R2VvQ29vcmRzRnJvbVppcGNvZGUoemlwY29kZSk7XG4gICAgICAgICAgICB2YXIgbGF0ID0gZ2VvRnJvbVppcC5sYXQ7XG4gICAgICAgICAgICB2YXIgbG9uZyA9IGdlb0Zyb21aaXAubG9uZztcblxuICAgICAgICAgICAgcmV0dXJuIGxvY2F0aW9uLmdldEZvcmNhc3RGcm9tR2VvQ29vcmRzKGxhdCwgbG9uZyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdGlhbGl6ZVdlYXRoZXJJY29uczogZnVuY3Rpb24od2VhdGhlcklkKSB7XG5cbiAgICAgICAgICAgIC8qKioqKioqIFdYIEljb25zICoqKioqKiovXG4gICAgICAgICAgICB2YXIgaWNvbiA9IFwid2ktbmFcIjtcblxuICAgICAgICAgICAgdmFyIGN1cnJlbnRJRCA9IHdlYXRoZXJJZDtcblxuICAgICAgICAgICAgLy8gVGh1bmRlcnN0b3JtXG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSAyMDAgJiYgY3VycmVudElEIDw9IDIzMiApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS10aHVuZGVyc3Rvcm0nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEcml6emxlIFxuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gMzAwICYmIGN1cnJlbnRJRCA8PSAzMjEgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktc2hvd2Vycyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJhaW5cbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDUwMCAmJiBjdXJyZW50SUQgPD0gNTMxICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LXJhaW4nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTbm93XG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSA2MDAgJiYgY3VycmVudElEIDw9IDYyMiApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1zbm93JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXRtb3NwaGVyZSAoZm9nLCBoYXplLCBldGMuKSBcbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDcwMSAmJiBjdXJyZW50SUQgPD0gNzgxICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LWZvZyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN1blxuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPT09IDgwMCB8fCBjdXJyZW50SUQgPT09IDgwMSApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1zdW5ueSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsb3Vkc1xuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gODAyICYmIGN1cnJlbnRJRCA8PSA4MDQgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktY2xvdWR5JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGljb247XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG5cbndlYXRoZXJBcHAuY29udHJvbGxlcignemlwY29kZScsIFsnJHNjb3BlJywgJyRyb290U2NvcGUnLCAnbG9jYXRpb24nLCBmdW5jdGlvbigkc2NvcGUsICRyb290U2NvcGUsIGxvY2F0aW9uKSB7XG5cbiAgICAkc2NvcGUuemlwY29kZUNsaWNrSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIGxvY2F0aW9uLnVwZGF0ZVppcGNvZGUoJHNjb3BlLnppcGNvZGUpO1xuXG4gICAgICAgIC8vIGZpcmVzIGEgJ3ppcGNvZGUgcmVjZWl2ZWQnIGV2ZW50IHdpdGggdGhpcyAkc2NvcGUncyB6aXBjb2RlIGFzIGFzIGFyZ1xuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3ppcGNvZGVVcGRhdGUnLCAkc2NvcGUuemlwY29kZSk7XG4gICAgfTtcbn1dKTtcblxud2VhdGhlckFwcC5jb250cm9sbGVyKCd3ZWF0aGVyQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIHdlYXRoZXJGYWN0b3J5LCBsb2NhdGlvbiwgJHEpIHtcblxuICAgICRzY29wZS5oaWRlRGF0YUZyb21WaWV3ID0gdHJ1ZTtcbiAgICAkc2NvcGUuemlwY29kZUVycm9yTWVzc2FnZSA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gZ2V0R2VvV2VhdGhlckFuZExvY2F0aW9uKCkge1xuXG4gICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIHdlYXRoZXJGYWN0b3J5LmdldFdlYXRoZXJGcm9tR2VvQ29vcmRzKGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG9uZylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUud2VhdGhlciA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnJHNjb3BlLndlYXRoZXInLCAkc2NvcGUud2VhdGhlcik7XG4gICAgICAgICAgICAgICAgdmFyIHdlYXRoZXJJZCA9ICRzY29wZS53ZWF0aGVyLndlYXRoZXJbMF0uaWQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmljb24gPSB3ZWF0aGVyRmFjdG9yeS5pbml0aWFsaXplV2VhdGhlckljb25zKHdlYXRoZXJJZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbG9jYXRpb24uZ2V0R2VvTG9jYXRpb25OYW1lKGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG9uZylcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvY2F0aW9uID0gZGF0YS5kYXRhLnJlc3VsdHNbNV0uYWRkcmVzc19jb21wb25lbnRzWzBdLmxvbmdfbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgd2VhdGhlckZhY3RvcnkuZ2V0Rm9yZWNhc3RGcm9tR2VvQ29vcmRzKGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG9uZylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZm9yZWNhc3QgPSBkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBsb2NhdGlvbi5nZXRHZW9Db29yZHMoKVxuICAgIC50aGVuKGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG5cbiAgICAgICAgbG9jYXRpb24ubGF0ID0gcG9zaXRpb24uY29vcmRzLmxhdGl0dWRlO1xuICAgICAgICBsb2NhdGlvbi5sb25nID0gcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZTtcblxuICAgICAgICBnZXRHZW9XZWF0aGVyQW5kTG9jYXRpb24oKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgJHNjb3BlLmhpZGVEYXRhRnJvbVZpZXcgPSBmYWxzZTtcbiAgICAgICAgfSwgXG5cbiAgICAgICAgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgLy9lcnJvciwgc2hvdyB6aXBjb2RlIGluc3RlYWRcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBmdW5jdGlvbiBmb3IgdGhlIGV2ZW50IGxpc3RlbmVyXG4gICAgLy8gd2hlbiBhICd6aXBjb2RlIHJlY2VpdmVkJyBldmVudCBhcHBlYXJzLCBcbiAgICAvLyB0aGlzIGZ1bmN0aW9uIGZpcmVzLlxuICAgIGZ1bmN0aW9uIGdldFppcGNvZGVXZWF0aGVyQW5kTG9jYXRpb24oemlwY29kZSkge1xuXG4gICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIHdlYXRoZXJGYWN0b3J5LmdldFdlYXRoZXJGcm9tWmlwY29kZSh6aXBjb2RlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5kYXRhLmNvZCA9PT0gJzQwNCcpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmhpZGVEYXRhRnJvbVZpZXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuemlwY29kZUVycm9yTWVzc2FnZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS56aXBjb2RlID0gemlwY29kZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHppcGNvZGVFcnJvciA9ICdFUlJPUiA6IE9wZW4gV2VhdGhlclxcJ3Mgc2VydmVyIHJldHVybmVkIGEgNDA0IHN0YXR1cyBmb3IgdGhpcyB6aXBjb2RlIC0+ICcgKyB6aXBjb2RlO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh6aXBjb2RlRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KHppcGNvZGVFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnppcGNvZGVFcnJvck1lc3NhZ2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkc2NvcGUud2VhdGhlciA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgd2VhdGhlcklkID0gJHNjb3BlLndlYXRoZXIud2VhdGhlclswXS5pZDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaWNvbiA9IHdlYXRoZXJGYWN0b3J5LmluaXRpYWxpemVXZWF0aGVySWNvbnMod2VhdGhlcklkKTtcblxuICAgICAgICAgICAgICAgIGxvY2F0aW9uLmdldFppcGNvZGVMb2NhdGlvbk5hbWUoemlwY29kZSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3ppcGNvZGUgbG9jYXRpb24gZGF0YScsIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9jYXRpb24gPSBkYXRhLmRhdGEucmVzdWx0c1swXS5hZGRyZXNzX2NvbXBvbmVudHNbMV0ubG9uZ19uYW1lO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF0ID0gZGF0YS5kYXRhLnJlc3VsdHNbMF0uZ2VvbWV0cnkubG9jYXRpb24ubGF0O1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9uZyA9IGRhdGEuZGF0YS5yZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uLmxuZztcblxuICAgICAgICAgICAgICAgICAgICB3ZWF0aGVyRmFjdG9yeS5nZXRGb3JlY2FzdEZyb21HZW9Db29yZHMobGF0LCBsb25nKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnemlwY29kZSBmb3JlY2FzdCBkYXRhOiAnLCBkYXRhLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcmVjYXN0ID0gZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgJHNjb3BlLiRvbignemlwY29kZVVwZGF0ZScsIGZ1bmN0aW9uKGV2ZW50LCB6aXBjb2RlKSB7XG4gICAgICAgIFxuICAgICAgICBnZXRaaXBjb2RlV2VhdGhlckFuZExvY2F0aW9uKHppcGNvZGUpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVEYXRhRnJvbVZpZXcgPSBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
