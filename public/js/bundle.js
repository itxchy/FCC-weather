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
            return location.getZipcodeLocationName(zipcode).then(function (data) {
                var lat = data.data.results[0].geometry.location.lat;
                var long = data.data.result[0].geometry.location.lng;
                return { lat: lat, long: long };
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
            var geoFromZip = getGeoCoordsFromZipcode(zipcode);
            var lat = geoFromZip.lat;
            var long = geoFromZip.long;

            return location.getWeatherFromGeocoords(lat, long);
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

            var geoFromZip = getGeoCoordsFromZipcode(zipcode);
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
//# sourceMappingURL=data:application/json;base64,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QVAsR0FBa0IsS0FBSyxJQUFMLENBQVUsT0FBVixDQUFrQixDQUFsQixFQUFxQixrQkFBckIsQ0FBd0MsQ0FBeEMsRUFBMkMsU0FBN0Q7QUFDQSx3QkFBSSxNQUFNLEtBQUssSUFBTCxDQUFVLE9BQVYsQ0FBa0IsQ0FBbEIsRUFBcUIsUUFBckIsQ0FBOEIsUUFBOUIsQ0FBdUMsR0FBakQ7QUFDQSx3QkFBSSxPQUFPLEtBQUssSUFBTCxDQUFVLE1BQVYsQ0FBaUIsQ0FBakIsRUFBb0IsUUFBcEIsQ0FBNkIsUUFBN0IsQ0FBc0MsR0FBakQ7O0FBRUEsbUNBQWUsd0JBQWYsQ0FBd0MsR0FBeEMsRUFBNkMsSUFBN0MsRUFDQyxJQURELENBQ00sVUFBUyxJQUFULEVBQWU7QUFDakIsZ0NBQVEsR0FBUixDQUFZLHlCQUFaLEVBQXVDLEtBQUssSUFBNUM7QUFDQSwrQkFBTyxRQUFQLEdBQWtCLEtBQUssSUFBdkI7QUFDQSwrQkFBTyxRQUFRLElBQVIsQ0FBUDtBQUVILHFCQU5EO0FBT0gsaUJBZkQ7QUFnQkgsYUFuQ0Q7QUFvQ0gsU0F0Q00sQ0FBUDtBQXVDSDs7QUFFRCxXQUFPLEdBQVAsQ0FBVyxlQUFYLEVBQTRCLFVBQVMsS0FBVCxFQUFnQixPQUFoQixFQUF5Qjs7QUFFakQscUNBQTZCLE9BQTdCLEVBQ0MsSUFERCxDQUNNLFlBQVc7QUFDYixtQkFBTyxnQkFBUCxHQUEwQixLQUExQjtBQUNILFNBSEQ7QUFJSCxLQU5EO0FBT0gsQ0E1R0QiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgd2VhdGhlckFwcCA9IGFuZ3VsYXIubW9kdWxlKCd3ZWF0aGVyQXBwJywgW10pO1xuXG53ZWF0aGVyQXBwLmZhY3RvcnkoJ2xvY2F0aW9uJywgZnVuY3Rpb24oJHEsICRodHRwKSB7XG5cbiAgICB2YXIgY2xpZW50T3JpZ2luID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbiAgICB2YXIgbGF0ID0gbnVsbDtcbiAgICB2YXIgbG9uZyA9IG51bGw7XG4gICAgdmFyIHppcGNvZGUgPSBudWxsO1xuXG4gICAgcmV0dXJuIHtcblxuICAgICAgICBnZXRHZW9Db29yZHM6IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgICAgICBpZihuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pIHtcblxuICAgICAgICAgICAgICAgICAgICAvLyBpZiBzdWNjZXNzZnVsLCByZXNvbHZlIHRoZSBwcm9taXNlIHdpdGggdGhlIHBvc2l0aW9uIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH0sIFxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHRoZXJlJ3MgYW4gZXJyb3IsIHJlamVjdCB0aGUgcHJvbWlzZSBhbmQgcGFzcyB0aGUgZXJyb3IgYWxvbmdcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0R2VvQ29vcmRzRnJvbVppcGNvZGU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbi5nZXRaaXBjb2RlTG9jYXRpb25OYW1lKHppcGNvZGUpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF0ID0gZGF0YS5kYXRhLnJlc3VsdHNbMF0uZ2VvbWV0cnkubG9jYXRpb24ubGF0O1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9uZyA9IGRhdGEuZGF0YS5yZXN1bHRbMF0uZ2VvbWV0cnkubG9jYXRpb24ubG5nO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge2xhdDogbGF0LCBsb25nOiBsb25nfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlWmlwY29kZTogZnVuY3Rpb24oemlwY29kZSkge1xuICAgICAgICAgICAgdGhpcy56aXBjb2RlID0gemlwY29kZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnppcGNvZGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqKioqKiogQ2FsbHMgR29vZ2xlIE1hcCdzIEFQSSwgcmV0dXJucyBsb2NhdGlvbiBkZXRhaWxzIGJhc2VkIG9uIGdlbyBjb29yZGluYXRlcyAqKioqKioqL1xuICAgICAgICBnZXRHZW9Mb2NhdGlvbk5hbWU6IGZ1bmN0aW9uKGxhdCwgbG9uZykge1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGAke2NsaWVudE9yaWdpbn0vYXBpL2xvY2F0aW9uL2dlb2xvY2F0aW9uP2xhdD0ke2xhdH0mbG9uZz0ke2xvbmd9YClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihsb2NhdGlvbkRhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdChsb2NhdGlvbkRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbG9jYXRpb25EYXRhO1xuICAgICAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChsb2NhdGlvbkRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0WmlwY29kZUxvY2F0aW9uTmFtZTogZnVuY3Rpb24oemlwY29kZSkge1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGAke2NsaWVudE9yaWdpbn0vYXBpL2xvY2F0aW9uL3ppcGNvZGU/emlwY29kZT0ke3ppcGNvZGV9YClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihsb2NhdGlvbkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2dvb2dsZSBhcGkgemlwY29kZSByZXN1bHRzOiAnLCBsb2NhdGlvbkRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdChsb2NhdGlvbkRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbG9jYXRpb25EYXRhO1xuICAgICAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChsb2NhdGlvbkRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgemlwY29kZTogemlwY29kZSxcbiAgICAgICAgbGF0OiBsYXQsXG4gICAgICAgIGxvbmc6IGxvbmdcbiAgICB9O1xufSk7XG5cbndlYXRoZXJBcHAuZmFjdG9yeSgnd2VhdGhlckZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCwgJHEpIHtcbiAgICB2YXIgY2xpZW50T3JpZ2luID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbiAgICB2YXIgd2VhdGhlck9iamVjdCA9IG51bGw7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICAvKioqKioqKiBDYWxscyBPcGVuV2VhdGhlck1hcCdzIEFQSSwgcmV0dXJucyBjdXJyZW50IHdlYXRoZXIgZGF0YSAqKioqKioqL1xuICAgICAgICBnZXRXZWF0aGVyRnJvbUdlb0Nvb3JkczogZnVuY3Rpb24obGF0LCBsb25nKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvd2VhdGhlci9nZW9jb29yZHM/bGF0PSR7bGF0fSZsb25nPSR7bG9uZ31gKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHdlYXRoZXJEYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3Qod2VhdGhlckRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gd2VhdGhlckRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0gXG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHdlYXRoZXJEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFdlYXRoZXJGcm9tWmlwY29kZTogZnVuY3Rpb24oemlwY29kZSkge1xuICAgICAgICAgICAgdmFyIGdlb0Zyb21aaXAgPSBnZXRHZW9Db29yZHNGcm9tWmlwY29kZSh6aXBjb2RlKTtcbiAgICAgICAgICAgIHZhciBsYXQgPSBnZW9Gcm9tWmlwLmxhdDtcbiAgICAgICAgICAgIHZhciBsb25nID0gZ2VvRnJvbVppcC5sb25nO1xuXG4gICAgICAgICAgICByZXR1cm4gbG9jYXRpb24uZ2V0V2VhdGhlckZyb21HZW9jb29yZHMobGF0LCBsb25nKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKioqKioqKiBDYWxscyBPcGVuV2VhdGhlck1hcCdzIEFQSSwgcmV0dXJucyA3IGRheSBmb3JjYXN0ICoqKioqKiovICAgXG4gICAgICAgIGdldEZvcmVjYXN0RnJvbUdlb0Nvb3JkczogZnVuY3Rpb24obGF0LCBsb25nKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvZm9yZWNhc3QvZ2VvY29vcmRzP2xhdD0ke2xhdH0mbG9uZz0ke2xvbmd9YClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihmb3JlY2FzdERhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdChmb3JlY2FzdERhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9yZWNhc3REYXRhO1xuICAgICAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChmb3JlY2FzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0Rm9yZWNhc3RGcm9tWmlwY29kZTogZnVuY3Rpb24oemlwY29kZSkge1xuXG4gICAgICAgICAgICB2YXIgZ2VvRnJvbVppcCA9IGdldEdlb0Nvb3Jkc0Zyb21aaXBjb2RlKHppcGNvZGUpO1xuICAgICAgICAgICAgdmFyIGxhdCA9IGdlb0Zyb21aaXAubGF0O1xuICAgICAgICAgICAgdmFyIGxvbmcgPSBnZW9Gcm9tWmlwLmxvbmc7XG5cbiAgICAgICAgICAgIHJldHVybiBsb2NhdGlvbi5nZXRGb3JjYXN0RnJvbUdlb0Nvb3JkcyhsYXQsIGxvbmcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGluaXRpYWxpemVXZWF0aGVySWNvbnM6IGZ1bmN0aW9uKHdlYXRoZXJJZCkge1xuXG4gICAgICAgICAgICAvKioqKioqKiBXWCBJY29ucyAqKioqKioqL1xuICAgICAgICAgICAgdmFyIGljb24gPSBcIndpLW5hXCI7XG5cbiAgICAgICAgICAgIHZhciBjdXJyZW50SUQgPSB3ZWF0aGVySWQ7XG5cbiAgICAgICAgICAgIC8vIFRodW5kZXJzdG9ybVxuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gMjAwICYmIGN1cnJlbnRJRCA8PSAyMzIgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktdGh1bmRlcnN0b3JtJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRHJpenpsZSBcbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDMwMCAmJiBjdXJyZW50SUQgPD0gMzIxICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LXNob3dlcnMnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSYWluXG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSA1MDAgJiYgY3VycmVudElEIDw9IDUzMSApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1yYWluJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU25vd1xuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gNjAwICYmIGN1cnJlbnRJRCA8PSA2MjIgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktc25vdyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEF0bW9zcGhlcmUgKGZvZywgaGF6ZSwgZXRjLikgXG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSA3MDEgJiYgY3VycmVudElEIDw9IDc4MSApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1mb2cnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdW5cbiAgICAgICAgICAgIGlmICggY3VycmVudElEID09PSA4MDAgfHwgY3VycmVudElEID09PSA4MDEgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktc3VubnknO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbG91ZHNcbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDgwMiAmJiBjdXJyZW50SUQgPD0gODA0ICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LWNsb3VkeSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBpY29uO1xuICAgICAgICB9XG4gICAgfTtcbn0pO1xuXG53ZWF0aGVyQXBwLmNvbnRyb2xsZXIoJ3ppcGNvZGUnLCBbJyRzY29wZScsICckcm9vdFNjb3BlJywgJ2xvY2F0aW9uJywgZnVuY3Rpb24oJHNjb3BlLCAkcm9vdFNjb3BlLCBsb2NhdGlvbikge1xuXG4gICAgJHNjb3BlLnppcGNvZGVDbGlja0hhbmRsZXIgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICBsb2NhdGlvbi51cGRhdGVaaXBjb2RlKCRzY29wZS56aXBjb2RlKTtcblxuICAgICAgICAvLyBmaXJlcyBhICd6aXBjb2RlIHJlY2VpdmVkJyBldmVudCB3aXRoIHRoaXMgJHNjb3BlJ3MgemlwY29kZSBhcyBhcyBhcmdcbiAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCd6aXBjb2RlVXBkYXRlJywgJHNjb3BlLnppcGNvZGUpO1xuICAgIH07XG59XSk7XG5cbndlYXRoZXJBcHAuY29udHJvbGxlcignd2VhdGhlckN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCB3ZWF0aGVyRmFjdG9yeSwgbG9jYXRpb24sICRxKSB7XG5cbiAgICAkc2NvcGUuaGlkZURhdGFGcm9tVmlldyA9IHRydWU7XG4gICAgJHNjb3BlLnppcGNvZGVFcnJvck1lc3NhZ2UgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIGdldEdlb1dlYXRoZXJBbmRMb2NhdGlvbigpIHtcblxuICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICB3ZWF0aGVyRmFjdG9yeS5nZXRXZWF0aGVyRnJvbUdlb0Nvb3Jkcyhsb2NhdGlvbi5sYXQsIGxvY2F0aW9uLmxvbmcpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLndlYXRoZXIgPSBkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIHdlYXRoZXJJZCA9ICRzY29wZS53ZWF0aGVyLndlYXRoZXJbMF0uaWQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmljb24gPSB3ZWF0aGVyRmFjdG9yeS5pbml0aWFsaXplV2VhdGhlckljb25zKHdlYXRoZXJJZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbG9jYXRpb24uZ2V0R2VvTG9jYXRpb25OYW1lKGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG9uZylcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvY2F0aW9uID0gZGF0YS5kYXRhLnJlc3VsdHNbNV0uYWRkcmVzc19jb21wb25lbnRzWzBdLmxvbmdfbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgd2VhdGhlckZhY3RvcnkuZ2V0Rm9yZWNhc3RGcm9tR2VvQ29vcmRzKGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG9uZylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZm9yZWNhc3QgPSBkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBsb2NhdGlvbi5nZXRHZW9Db29yZHMoKVxuICAgIC50aGVuKGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG5cbiAgICAgICAgbG9jYXRpb24ubGF0ID0gcG9zaXRpb24uY29vcmRzLmxhdGl0dWRlO1xuICAgICAgICBsb2NhdGlvbi5sb25nID0gcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZTtcblxuICAgICAgICBnZXRHZW9XZWF0aGVyQW5kTG9jYXRpb24oKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgJHNjb3BlLmhpZGVEYXRhRnJvbVZpZXcgPSBmYWxzZTtcbiAgICAgICAgfSwgXG5cbiAgICAgICAgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgLy9lcnJvciwgc2hvdyB6aXBjb2RlIGluc3RlYWRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcjtcbiAgICB9KTtcblxuICAgIC8vIGZ1bmN0aW9uIGZvciB0aGUgZXZlbnQgbGlzdGVuZXJcbiAgICAvLyB3aGVuIGEgJ3ppcGNvZGUgcmVjZWl2ZWQnIGV2ZW50IGFwcGVhcnMsIFxuICAgIC8vIHRoaXMgZnVuY3Rpb24gZmlyZXMuXG4gICAgZnVuY3Rpb24gZ2V0WmlwY29kZVdlYXRoZXJBbmRMb2NhdGlvbih6aXBjb2RlKSB7XG5cbiAgICAgICAgcmV0dXJuICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICAgICAgd2VhdGhlckZhY3RvcnkuZ2V0V2VhdGhlckZyb21aaXBjb2RlKHppcGNvZGUpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKTtcblxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmRhdGEuY29kID09PSAnNDA0Jykge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaGlkZURhdGFGcm9tVmlldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS56aXBjb2RlRXJyb3JNZXNzYWdlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnppcGNvZGUgPSB6aXBjb2RlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgemlwY29kZUVycm9yID0gJ0VSUk9SOiBPcGVuIFdlYXRoZXJcXCdzIHNlcnZlciByZXR1cm5lZCBhIDQwNCBzdGF0dXMgZm9yIHRoaXMgemlwY29kZSAtPiAnICsgemlwY29kZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coemlwY29kZUVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdCh6aXBjb2RlRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRzY29wZS56aXBjb2RlRXJyb3JNZXNzYWdlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLndlYXRoZXIgPSBkYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIHdlYXRoZXJJZCA9ICRzY29wZS53ZWF0aGVyLndlYXRoZXJbMF0uaWQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmljb24gPSB3ZWF0aGVyRmFjdG9yeS5pbml0aWFsaXplV2VhdGhlckljb25zKHdlYXRoZXJJZCk7XG5cbiAgICAgICAgICAgICAgICBsb2NhdGlvbi5nZXRaaXBjb2RlTG9jYXRpb25OYW1lKHppcGNvZGUpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd6aXBjb2RlIGxvY2F0aW9uIGRhdGEnLCBkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvY2F0aW9uID0gZGF0YS5kYXRhLnJlc3VsdHNbMF0uYWRkcmVzc19jb21wb25lbnRzWzFdLmxvbmdfbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxhdCA9IGRhdGEuZGF0YS5yZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uLmxhdDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvbmcgPSBkYXRhLmRhdGEucmVzdWx0WzBdLmdlb21ldHJ5LmxvY2F0aW9uLmxuZztcblxuICAgICAgICAgICAgICAgICAgICB3ZWF0aGVyRmFjdG9yeS5nZXRGb3JlY2FzdEZyb21HZW9Db29yZHMobGF0LCBsb25nKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnemlwY29kZSBmb3JlY2FzdCBkYXRhOiAnLCBkYXRhLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcmVjYXN0ID0gZGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgJHNjb3BlLiRvbignemlwY29kZVVwZGF0ZScsIGZ1bmN0aW9uKGV2ZW50LCB6aXBjb2RlKSB7XG4gICAgICAgIFxuICAgICAgICBnZXRaaXBjb2RlV2VhdGhlckFuZExvY2F0aW9uKHppcGNvZGUpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVEYXRhRnJvbVZpZXcgPSBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
