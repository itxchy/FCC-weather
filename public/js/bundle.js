'use strict';

/****** Angularjs ******/

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

                $scope.weather = data.data;
                var weatherId = $scope.weather.weather[0].id;
                $scope.icon = weatherFactory.initializeWeatherIcons(weatherId);

                if (!data) {
                    reject(error);
                }

                location.getZipcodeLocationName(zipcode).then(function (data) {

                    console.log('zipcode location data', data);
                    $scope.location = data.data.results[0].address_components[1].long_name;

                    weatherFactory.getForecastFromZipcode(zipcode).then(function (data) {
                        console.log('zipcode forecast data: ', data.data);
                        $scope.forecast = data.data;
                        resolve(data);
                    });
                });
            });
        });
    }

    $scope.$on('zipcodeUpdate', function (event, zipcode) {

        getZipcodeWeatherAndLocation(zipcode).then(function () {
            $scope.hideDataFromView = false;
        }, function (error) {
            //error, show zipcode instead
            //console.log("an error occured in getZipcodeWeatherAndLocation, ", error);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztBQUlBLElBQUksYUFBYSxRQUFRLE1BQVIsQ0FBZSxZQUFmLEVBQTZCLEVBQTdCLENBQWpCOztBQUVBLFdBQVcsT0FBWCxDQUFtQixVQUFuQixFQUErQixVQUFTLEVBQVQsRUFBYSxLQUFiLEVBQW9COztBQUUvQyxRQUFJLGVBQWUsT0FBTyxRQUFQLENBQWdCLE1BQW5DO0FBQ0EsUUFBSSxNQUFNLElBQVY7QUFDQSxRQUFJLE9BQU8sSUFBWDtBQUNBLFFBQUksVUFBVSxJQUFkOztBQUVBLFdBQU87O0FBRUgsc0JBQWMsd0JBQVc7O0FBRXJCLG1CQUFPLEdBQUcsVUFBUyxPQUFULEVBQWtCLE1BQWxCLEVBQTBCOztBQUVoQyxvQkFBRyxVQUFVLFdBQWIsRUFBMEI7OztBQUd0Qiw4QkFBVSxXQUFWLENBQXNCLGtCQUF0QixDQUF5QyxVQUFTLFFBQVQsRUFBbUI7QUFDeEQsK0JBQU8sUUFBUSxRQUFSLENBQVA7QUFDSCxxQkFGRDs7O0FBS0EsOEJBQVUsS0FBVixFQUFpQjtBQUNiLCtCQUFPLE9BQU8sS0FBUCxDQUFQO0FBQ0gscUJBUEQ7QUFRSCxpQkFYRCxNQWFLO0FBQ0QsMkJBQU8sUUFBUDtBQUNIO0FBQ0osYUFsQk0sQ0FBUDtBQW1CSCxTQXZCRTs7QUF5QkgsdUJBQWUsdUJBQVMsT0FBVCxFQUFrQjtBQUM3QixpQkFBSyxPQUFMLEdBQWUsT0FBZjtBQUNBLG1CQUFPLEtBQUssT0FBWjtBQUNILFNBNUJFOzs7QUErQkgsNEJBQW9CLDRCQUFTLEdBQVQsRUFBYyxJQUFkLEVBQW9COztBQUVwQyxtQkFBTyxNQUFNLEdBQU4sQ0FBYSxZQUFiLHNDQUEwRCxHQUExRCxjQUFzRSxJQUF0RSxFQUNGLElBREUsQ0FDRyxVQUFTLFlBQVQsRUFBdUI7O0FBRXpCLG9CQUFJLFFBQVEsUUFBUixDQUFpQixZQUFqQixDQUFKLEVBQW9DO0FBQ2hDLDJCQUFPLFlBQVA7QUFDSCxpQkFGRCxNQUlLO0FBQ0QsMkJBQU8sR0FBRyxNQUFILENBQVUsWUFBVixDQUFQO0FBQ0g7QUFDSixhQVZFLENBQVA7QUFXSCxTQTVDRTs7QUE4Q0gsZ0NBQXdCLGdDQUFTLE9BQVQsRUFBa0I7O0FBRXRDLG1CQUFPLE1BQU0sR0FBTixDQUFhLFlBQWIsc0NBQTBELE9BQTFELEVBQ0YsSUFERSxDQUNHLFVBQVMsWUFBVCxFQUF1Qjs7QUFFekIsb0JBQUksUUFBUSxRQUFSLENBQWlCLFlBQWpCLENBQUosRUFBb0M7QUFDaEMsMkJBQU8sWUFBUDtBQUNILGlCQUZELE1BSUs7QUFDRCwyQkFBTyxHQUFHLE1BQUgsQ0FBVSxZQUFWLENBQVA7QUFDSDtBQUNKLGFBVkUsQ0FBUDtBQVdILFNBM0RFOztBQTZESCxpQkFBUyxPQTdETjtBQThESCxhQUFLLEdBOURGO0FBK0RILGNBQU07QUEvREgsS0FBUDtBQWlFSCxDQXhFRDs7QUEwRUEsV0FBVyxPQUFYLENBQW1CLGdCQUFuQixFQUFxQyxVQUFTLEtBQVQsRUFBZ0IsRUFBaEIsRUFBb0I7QUFDckQsUUFBSSxlQUFlLE9BQU8sUUFBUCxDQUFnQixNQUFuQztBQUNBLFFBQUksZ0JBQWdCLElBQXBCOztBQUVBLFdBQU87O0FBRUgsaUNBQXlCLGlDQUFTLEdBQVQsRUFBYyxJQUFkLEVBQW9COztBQUV6QyxtQkFBTyxNQUFNLEdBQU4sQ0FBYSxZQUFiLG1DQUF1RCxHQUF2RCxjQUFtRSxJQUFuRSxFQUNGLElBREUsQ0FDRyxVQUFTLFdBQVQsRUFBc0I7O0FBRXhCLG9CQUFJLFFBQVEsUUFBUixDQUFpQixXQUFqQixDQUFKLEVBQW1DO0FBQy9CLDJCQUFPLFdBQVA7QUFDSCxpQkFGRCxNQUlLO0FBQ0QsMkJBQU8sR0FBRyxNQUFILENBQVUsV0FBVixDQUFQO0FBQ0g7QUFDSixhQVZFLENBQVA7QUFXSCxTQWZFOztBQWlCSCwrQkFBdUIsK0JBQVMsT0FBVCxFQUFrQjs7QUFFckMsbUJBQU8sTUFBTSxHQUFOLENBQWEsWUFBYixxQ0FBeUQsT0FBekQsRUFDRixJQURFLENBQ0csVUFBUyxXQUFULEVBQXNCOztBQUV4QixvQkFBSSxRQUFRLFFBQVIsQ0FBaUIsV0FBakIsQ0FBSixFQUFtQztBQUMvQiwyQkFBTyxXQUFQO0FBQ0gsaUJBRkQsTUFJSztBQUNELDJCQUFPLEdBQUcsTUFBSCxDQUFVLFdBQVYsQ0FBUDtBQUNIO0FBQ0osYUFWRSxDQUFQO0FBV0gsU0E5QkU7OztBQWlDSCxrQ0FBMEIsa0NBQVMsR0FBVCxFQUFjLElBQWQsRUFBb0I7O0FBRTFDLG1CQUFPLE1BQU0sR0FBTixDQUFhLFlBQWIsb0NBQXdELEdBQXhELGNBQW9FLElBQXBFLEVBQ0YsSUFERSxDQUNHLFVBQVMsWUFBVCxFQUF1Qjs7QUFFekIsb0JBQUksUUFBUSxRQUFSLENBQWlCLFlBQWpCLENBQUosRUFBb0M7QUFDaEMsMkJBQU8sWUFBUDtBQUNILGlCQUZELE1BSUs7QUFDRCwyQkFBTyxHQUFHLE1BQUgsQ0FBVSxZQUFWLENBQVA7QUFDSDtBQUNKLGFBVkUsQ0FBUDtBQVdILFNBOUNFOztBQWdESCxnQ0FBd0IsZ0NBQVMsT0FBVCxFQUFrQjs7QUFFdEMsbUJBQU8sTUFBTSxHQUFOLENBQWEsWUFBYixzQ0FBMEQsT0FBMUQsRUFDRixJQURFLENBQ0csVUFBUyxZQUFULEVBQXVCOztBQUV6QixvQkFBSSxRQUFRLFFBQVIsQ0FBaUIsWUFBakIsQ0FBSixFQUFvQztBQUNoQywyQkFBTyxZQUFQO0FBQ0gsaUJBRkQsTUFJSztBQUNELDJCQUFPLEdBQUcsTUFBSCxDQUFVLFlBQVYsQ0FBUDtBQUNIO0FBQ0osYUFWRSxDQUFQO0FBV0gsU0E3REU7O0FBK0RILGdDQUF3QixnQ0FBUyxTQUFULEVBQW9COzs7QUFHeEMsZ0JBQUksT0FBTyxPQUFYOztBQUVBLGdCQUFJLFlBQVksU0FBaEI7OztBQUdBLGdCQUFLLGFBQWEsR0FBYixJQUFvQixhQUFhLEdBQXRDLEVBQTRDO0FBQ3hDLHVCQUFPLHFCQUFQO0FBQ0g7OztBQUdELGdCQUFLLGFBQWEsR0FBYixJQUFvQixhQUFhLEdBQXRDLEVBQTRDO0FBQ3hDLHVCQUFPLGdCQUFQO0FBQ0g7OztBQUdELGdCQUFLLGFBQWEsR0FBYixJQUFvQixhQUFhLEdBQXRDLEVBQTRDO0FBQ3hDLHVCQUFPLGFBQVA7QUFDSDs7O0FBR0QsZ0JBQUssYUFBYSxHQUFiLElBQW9CLGFBQWEsR0FBdEMsRUFBNEM7QUFDeEMsdUJBQU8sYUFBUDtBQUNIOzs7QUFHRCxnQkFBSyxhQUFhLEdBQWIsSUFBb0IsYUFBYSxHQUF0QyxFQUE0QztBQUN4Qyx1QkFBTyxZQUFQO0FBQ0g7OztBQUdELGdCQUFLLGNBQWMsR0FBZCxJQUFxQixjQUFjLEdBQXhDLEVBQThDO0FBQzFDLHVCQUFPLGNBQVA7QUFDSDs7O0FBR0QsZ0JBQUssYUFBYSxHQUFiLElBQW9CLGFBQWEsR0FBdEMsRUFBNEM7QUFDeEMsdUJBQU8sZUFBUDtBQUNIOztBQUVELG1CQUFPLElBQVA7QUFDSDtBQTFHRSxLQUFQO0FBNEdILENBaEhEOztBQWtIQSxXQUFXLFVBQVgsQ0FBc0IsU0FBdEIsRUFBaUMsQ0FBQyxRQUFELEVBQVcsWUFBWCxFQUF5QixVQUF6QixFQUFxQyxVQUFTLE1BQVQsRUFBaUIsVUFBakIsRUFBNkIsUUFBN0IsRUFBdUM7O0FBRXpHLFdBQU8sbUJBQVAsR0FBNkIsWUFBVzs7QUFFcEMsaUJBQVMsYUFBVCxDQUF1QixPQUFPLE9BQTlCOzs7QUFHQSxtQkFBVyxVQUFYLENBQXNCLGVBQXRCLEVBQXVDLE9BQU8sT0FBOUM7QUFDSCxLQU5EO0FBT0gsQ0FUZ0MsQ0FBakM7O0FBV0EsV0FBVyxVQUFYLENBQXNCLGFBQXRCLEVBQXFDLFVBQVUsTUFBVixFQUFrQixjQUFsQixFQUFrQyxRQUFsQyxFQUE0QyxFQUE1QyxFQUFnRDs7QUFFakYsV0FBTyxnQkFBUCxHQUEwQixJQUExQjs7QUFFQSxhQUFTLHdCQUFULEdBQW9DOztBQUVoQyxlQUFPLEdBQUcsVUFBVSxPQUFWLEVBQW1CLE1BQW5CLEVBQTJCOztBQUVqQywyQkFBZSx1QkFBZixDQUF1QyxTQUFTLEdBQWhELEVBQXFELFNBQVMsSUFBOUQsRUFDQyxJQURELENBQ00sVUFBVSxJQUFWLEVBQWdCOztBQUVsQix1QkFBTyxPQUFQLEdBQWlCLEtBQUssSUFBdEI7QUFDQSxvQkFBSSxZQUFZLE9BQU8sT0FBUCxDQUFlLE9BQWYsQ0FBdUIsQ0FBdkIsRUFBMEIsRUFBMUM7QUFDQSx1QkFBTyxJQUFQLEdBQWMsZUFBZSxzQkFBZixDQUFzQyxTQUF0QyxDQUFkOztBQUVBLG9CQUFJLENBQUMsSUFBTCxFQUFXO0FBQ1A7QUFDSDs7QUFFRCx5QkFBUyxrQkFBVCxDQUE0QixTQUFTLEdBQXJDLEVBQTBDLFNBQVMsSUFBbkQsRUFDQyxJQURELENBQ00sVUFBUyxJQUFULEVBQWU7O0FBRWpCLDJCQUFPLFFBQVAsR0FBa0IsS0FBSyxJQUFMLENBQVUsT0FBVixDQUFrQixDQUFsQixFQUFxQixrQkFBckIsQ0FBd0MsQ0FBeEMsRUFBMkMsU0FBN0Q7QUFDQSxtQ0FBZSx3QkFBZixDQUF3QyxTQUFTLEdBQWpELEVBQXNELFNBQVMsSUFBL0QsRUFDQyxJQURELENBQ00sVUFBUyxJQUFULEVBQWU7O0FBRWpCLCtCQUFPLFFBQVAsR0FBa0IsS0FBSyxJQUF2QjtBQUNBLGdDQUFRLElBQVI7QUFDSCxxQkFMRDtBQU1ILGlCQVZEO0FBV0gsYUF0QkQ7QUF1QkgsU0F6Qk0sQ0FBUDtBQTBCSDs7QUFFRCxhQUFTLFlBQVQsR0FDQyxJQURELENBQ00sVUFBUyxRQUFULEVBQW1COztBQUVyQixpQkFBUyxHQUFULEdBQWUsU0FBUyxNQUFULENBQWdCLFFBQS9CO0FBQ0EsaUJBQVMsSUFBVCxHQUFnQixTQUFTLE1BQVQsQ0FBZ0IsU0FBaEM7O0FBRUEsbUNBQ0MsSUFERCxDQUNNLFlBQVc7O0FBRWIsbUJBQU8sZ0JBQVAsR0FBMEIsS0FBMUI7QUFDSCxTQUpELEVBTUEsVUFBUyxLQUFULEVBQWdCOztBQUVmLFNBUkQ7QUFVQyxLQWhCTCxFQWdCTyxVQUFTLEtBQVQsRUFBZ0I7QUFDZixlQUFPLEtBQVA7QUFDUCxLQWxCRDs7Ozs7QUF1QkEsYUFBUyw0QkFBVCxDQUFzQyxPQUF0QyxFQUErQzs7QUFFM0MsZUFBTyxHQUFHLFVBQVUsT0FBVixFQUFtQixNQUFuQixFQUEyQjs7QUFFakMsMkJBQWUscUJBQWYsQ0FBcUMsT0FBckMsRUFDQyxJQURELENBQ00sVUFBVSxJQUFWLEVBQWdCOztBQUVsQix1QkFBTyxPQUFQLEdBQWlCLEtBQUssSUFBdEI7QUFDQSxvQkFBSSxZQUFZLE9BQU8sT0FBUCxDQUFlLE9BQWYsQ0FBdUIsQ0FBdkIsRUFBMEIsRUFBMUM7QUFDQSx1QkFBTyxJQUFQLEdBQWMsZUFBZSxzQkFBZixDQUFzQyxTQUF0QyxDQUFkOztBQUVBLG9CQUFJLENBQUMsSUFBTCxFQUFXO0FBQ1AsMkJBQU8sS0FBUDtBQUNIOztBQUVELHlCQUFTLHNCQUFULENBQWdDLE9BQWhDLEVBQ0MsSUFERCxDQUNNLFVBQVMsSUFBVCxFQUFlOztBQUVqQiw0QkFBUSxHQUFSLENBQVksdUJBQVosRUFBcUMsSUFBckM7QUFDQSwyQkFBTyxRQUFQLEdBQWtCLEtBQUssSUFBTCxDQUFVLE9BQVYsQ0FBa0IsQ0FBbEIsRUFBcUIsa0JBQXJCLENBQXdDLENBQXhDLEVBQTJDLFNBQTdEOztBQUVBLG1DQUFlLHNCQUFmLENBQXNDLE9BQXRDLEVBQ0MsSUFERCxDQUNNLFVBQVMsSUFBVCxFQUFlO0FBQ2pCLGdDQUFRLEdBQVIsQ0FBWSx5QkFBWixFQUF1QyxLQUFLLElBQTVDO0FBQ0EsK0JBQU8sUUFBUCxHQUFrQixLQUFLLElBQXZCO0FBQ0EsZ0NBQVEsSUFBUjtBQUVILHFCQU5EO0FBT0gsaUJBYkQ7QUFjSCxhQXpCRDtBQTBCSCxTQTVCTSxDQUFQO0FBNkJIOztBQUVELFdBQU8sR0FBUCxDQUFXLGVBQVgsRUFBNEIsVUFBUyxLQUFULEVBQWdCLE9BQWhCLEVBQXlCOztBQUVqRCxxQ0FBNkIsT0FBN0IsRUFDQyxJQURELENBQ00sWUFBVztBQUNiLG1CQUFPLGdCQUFQLEdBQTBCLEtBQTFCO0FBQ0gsU0FIRCxFQUlBLFVBQVMsS0FBVCxFQUFnQjs7O0FBR2YsU0FQRDtBQVFILEtBVkQ7QUFXSCxDQXJHRCIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cblxuLyoqKioqKiBBbmd1bGFyanMgKioqKioqL1xudmFyIHdlYXRoZXJBcHAgPSBhbmd1bGFyLm1vZHVsZSgnd2VhdGhlckFwcCcsIFtdKTtcblxud2VhdGhlckFwcC5mYWN0b3J5KCdsb2NhdGlvbicsIGZ1bmN0aW9uKCRxLCAkaHR0cCkge1xuXG4gICAgdmFyIGNsaWVudE9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG4gICAgdmFyIGxhdCA9IG51bGw7XG4gICAgdmFyIGxvbmcgPSBudWxsO1xuICAgIHZhciB6aXBjb2RlID0gbnVsbDtcblxuICAgIHJldHVybiB7XG5cbiAgICAgICAgZ2V0R2VvQ29vcmRzOiBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRxKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICAgICAgaWYobmF2aWdhdG9yLmdlb2xvY2F0aW9uKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgc3VjY2Vzc2Z1bCwgcmVzb2x2ZSB0aGUgcHJvbWlzZSB3aXRoIHRoZSBwb3NpdGlvbiBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLmdlb2xvY2F0aW9uLmdldEN1cnJlbnRQb3NpdGlvbihmdW5jdGlvbihwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUocG9zaXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB9LCBcblxuICAgICAgICAgICAgICAgICAgICAvLyBpZiB0aGVyZSdzIGFuIGVycm9yLCByZWplY3QgdGhlIHByb21pc2UgYW5kIHBhc3MgdGhlIGVycm9yIGFsb25nXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gXG5cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZVppcGNvZGU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcbiAgICAgICAgICAgIHRoaXMuemlwY29kZSA9IHppcGNvZGU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy56aXBjb2RlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKioqKioqIENhbGxzIEdvb2dsZSBNYXAncyBBUEksIHJldHVybnMgbG9jYXRpb24gZGV0YWlscyBiYXNlZCBvbiBnZW8gY29vcmRpbmF0ZXMgKioqKioqKi9cbiAgICAgICAgZ2V0R2VvTG9jYXRpb25OYW1lOiBmdW5jdGlvbihsYXQsIGxvbmcpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9sb2NhdGlvbi9nZW9sb2NhdGlvbj9sYXQ9JHtsYXR9Jmxvbmc9JHtsb25nfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24obG9jYXRpb25EYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3QobG9jYXRpb25EYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2F0aW9uRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QobG9jYXRpb25EYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFppcGNvZGVMb2NhdGlvbk5hbWU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9sb2NhdGlvbi96aXBjb2RlP3ppcGNvZGU9JHt6aXBjb2RlfWApXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24obG9jYXRpb25EYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNPYmplY3QobG9jYXRpb25EYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvY2F0aW9uRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSBcblxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QobG9jYXRpb25EYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHppcGNvZGU6IHppcGNvZGUsXG4gICAgICAgIGxhdDogbGF0LFxuICAgICAgICBsb25nOiBsb25nXG4gICAgfTtcbn0pO1xuXG53ZWF0aGVyQXBwLmZhY3RvcnkoJ3dlYXRoZXJGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHAsICRxKSB7XG4gICAgdmFyIGNsaWVudE9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG4gICAgdmFyIHdlYXRoZXJPYmplY3QgPSBudWxsO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgLyoqKioqKiogQ2FsbHMgT3BlbldlYXRoZXJNYXAncyBBUEksIHJldHVybnMgY3VycmVudCB3ZWF0aGVyIGRhdGEgKioqKioqKi9cbiAgICAgICAgZ2V0V2VhdGhlckZyb21HZW9Db29yZHM6IGZ1bmN0aW9uKGxhdCwgbG9uZykge1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGAke2NsaWVudE9yaWdpbn0vYXBpL3dlYXRoZXIvZ2VvY29vcmRzP2xhdD0ke2xhdH0mbG9uZz0ke2xvbmd9YClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbih3ZWF0aGVyRGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzT2JqZWN0KHdlYXRoZXJEYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdlYXRoZXJEYXRhO1xuICAgICAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh3ZWF0aGVyRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRXZWF0aGVyRnJvbVppcGNvZGU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcblxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS93ZWF0aGVyL3ppcGNvZGU/emlwY29kZT0ke3ppcGNvZGV9YClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbih3ZWF0aGVyRGF0YSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzT2JqZWN0KHdlYXRoZXJEYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdlYXRoZXJEYXRhO1xuICAgICAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh3ZWF0aGVyRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKioqKioqKiBDYWxscyBPcGVuV2VhdGhlck1hcCdzIEFQSSwgcmV0dXJucyA3IGRheSBmb3JjYXN0ICoqKioqKiovICAgXG4gICAgICAgIGdldEZvcmVjYXN0RnJvbUdlb0Nvb3JkczogZnVuY3Rpb24obGF0LCBsb25nKSB7XG5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvZm9yZWNhc3QvZ2VvY29vcmRzP2xhdD0ke2xhdH0mbG9uZz0ke2xvbmd9YClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihmb3JlY2FzdERhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdChmb3JlY2FzdERhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9yZWNhc3REYXRhO1xuICAgICAgICAgICAgICAgICAgICB9IFxuXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChmb3JlY2FzdERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0Rm9yZWNhc3RGcm9tWmlwY29kZTogZnVuY3Rpb24oemlwY29kZSkge1xuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGAke2NsaWVudE9yaWdpbn0vYXBpL2ZvcmVjYXN0L3ppcGNvZGU/emlwY29kZT0ke3ppcGNvZGV9YClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihmb3JlY2FzdERhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdChmb3JlY2FzdERhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9yZWNhc3REYXRhO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KGZvcmVjYXN0RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbml0aWFsaXplV2VhdGhlckljb25zOiBmdW5jdGlvbih3ZWF0aGVySWQpIHtcblxuICAgICAgICAgICAgLyoqKioqKiogV1ggSWNvbnMgKioqKioqKi9cbiAgICAgICAgICAgIHZhciBpY29uID0gXCJ3aS1uYVwiO1xuXG4gICAgICAgICAgICB2YXIgY3VycmVudElEID0gd2VhdGhlcklkO1xuXG4gICAgICAgICAgICAvLyBUaHVuZGVyc3Rvcm1cbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDIwMCAmJiBjdXJyZW50SUQgPD0gMjMyICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LXRodW5kZXJzdG9ybSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERyaXp6bGUgXG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSAzMDAgJiYgY3VycmVudElEIDw9IDMyMSApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1zaG93ZXJzJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmFpblxuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gNTAwICYmIGN1cnJlbnRJRCA8PSA1MzEgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktcmFpbic7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNub3dcbiAgICAgICAgICAgIGlmICggY3VycmVudElEID49IDYwMCAmJiBjdXJyZW50SUQgPD0gNjIyICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LXNub3cnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdG1vc3BoZXJlIChmb2csIGhhemUsIGV0Yy4pIFxuICAgICAgICAgICAgaWYgKCBjdXJyZW50SUQgPj0gNzAxICYmIGN1cnJlbnRJRCA8PSA3ODEgKSB7XG4gICAgICAgICAgICAgICAgaWNvbiA9ICd3aS1kYXktZm9nJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3VuXG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA9PT0gODAwIHx8IGN1cnJlbnRJRCA9PT0gODAxICkge1xuICAgICAgICAgICAgICAgIGljb24gPSAnd2ktZGF5LXN1bm55JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2xvdWRzXG4gICAgICAgICAgICBpZiAoIGN1cnJlbnRJRCA+PSA4MDIgJiYgY3VycmVudElEIDw9IDgwNCApIHtcbiAgICAgICAgICAgICAgICBpY29uID0gJ3dpLWRheS1jbG91ZHknO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gaWNvbjtcbiAgICAgICAgfVxuICAgIH07XG59KTtcblxud2VhdGhlckFwcC5jb250cm9sbGVyKCd6aXBjb2RlJywgWyckc2NvcGUnLCAnJHJvb3RTY29wZScsICdsb2NhdGlvbicsIGZ1bmN0aW9uKCRzY29wZSwgJHJvb3RTY29wZSwgbG9jYXRpb24pIHtcblxuICAgICRzY29wZS56aXBjb2RlQ2xpY2tIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgbG9jYXRpb24udXBkYXRlWmlwY29kZSgkc2NvcGUuemlwY29kZSk7XG5cbiAgICAgICAgLy8gZmlyZXMgYSAnemlwY29kZSByZWNlaXZlZCcgZXZlbnQgd2l0aCB0aGlzICRzY29wZSdzIHppcGNvZGUgYXMgYXMgYXJnXG4gICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnemlwY29kZVVwZGF0ZScsICRzY29wZS56aXBjb2RlKTtcbiAgICB9O1xufV0pO1xuXG53ZWF0aGVyQXBwLmNvbnRyb2xsZXIoJ3dlYXRoZXJDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgd2VhdGhlckZhY3RvcnksIGxvY2F0aW9uLCAkcSkge1xuXG4gICAgJHNjb3BlLmhpZGVEYXRhRnJvbVZpZXcgPSB0cnVlO1xuXG4gICAgZnVuY3Rpb24gZ2V0R2VvV2VhdGhlckFuZExvY2F0aW9uKCkge1xuXG4gICAgICAgIHJldHVybiAkcShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIHdlYXRoZXJGYWN0b3J5LmdldFdlYXRoZXJGcm9tR2VvQ29vcmRzKGxvY2F0aW9uLmxhdCwgbG9jYXRpb24ubG9uZylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUud2VhdGhlciA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgd2VhdGhlcklkID0gJHNjb3BlLndlYXRoZXIud2VhdGhlclswXS5pZDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaWNvbiA9IHdlYXRoZXJGYWN0b3J5LmluaXRpYWxpemVXZWF0aGVySWNvbnMod2VhdGhlcklkKTtcblxuICAgICAgICAgICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBsb2NhdGlvbi5nZXRHZW9Mb2NhdGlvbk5hbWUobG9jYXRpb24ubGF0LCBsb2NhdGlvbi5sb25nKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9jYXRpb24gPSBkYXRhLmRhdGEucmVzdWx0c1s1XS5hZGRyZXNzX2NvbXBvbmVudHNbMF0ubG9uZ19uYW1lO1xuICAgICAgICAgICAgICAgICAgICB3ZWF0aGVyRmFjdG9yeS5nZXRGb3JlY2FzdEZyb21HZW9Db29yZHMobG9jYXRpb24ubGF0LCBsb2NhdGlvbi5sb25nKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JlY2FzdCA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGxvY2F0aW9uLmdldEdlb0Nvb3JkcygpXG4gICAgLnRoZW4oZnVuY3Rpb24ocG9zaXRpb24pIHtcblxuICAgICAgICBsb2NhdGlvbi5sYXQgPSBwb3NpdGlvbi5jb29yZHMubGF0aXR1ZGU7XG4gICAgICAgIGxvY2F0aW9uLmxvbmcgPSBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlO1xuXG4gICAgICAgIGdldEdlb1dlYXRoZXJBbmRMb2NhdGlvbigpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAkc2NvcGUuaGlkZURhdGFGcm9tVmlldyA9IGZhbHNlO1xuICAgICAgICB9LCBcblxuICAgICAgICBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAvL2Vycm9yLCBzaG93IHppcGNvZGUgaW5zdGVhZFxuICAgICAgICB9KTtcblxuICAgICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgIH0pO1xuXG4gICAgLy8gZnVuY3Rpb24gZm9yIHRoZSBldmVudCBsaXN0ZW5lclxuICAgIC8vIHdoZW4gYSAnemlwY29kZSByZWNlaXZlZCcgZXZlbnQgYXBwZWFycywgXG4gICAgLy8gdGhpcyBmdW5jdGlvbiBmaXJlcy5cbiAgICBmdW5jdGlvbiBnZXRaaXBjb2RlV2VhdGhlckFuZExvY2F0aW9uKHppcGNvZGUpIHtcblxuICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICB3ZWF0aGVyRmFjdG9yeS5nZXRXZWF0aGVyRnJvbVppcGNvZGUoemlwY29kZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUud2VhdGhlciA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgd2VhdGhlcklkID0gJHNjb3BlLndlYXRoZXIud2VhdGhlclswXS5pZDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuaWNvbiA9IHdlYXRoZXJGYWN0b3J5LmluaXRpYWxpemVXZWF0aGVySWNvbnMod2VhdGhlcklkKTtcblxuICAgICAgICAgICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGxvY2F0aW9uLmdldFppcGNvZGVMb2NhdGlvbk5hbWUoemlwY29kZSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3ppcGNvZGUgbG9jYXRpb24gZGF0YScsIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUubG9jYXRpb24gPSBkYXRhLmRhdGEucmVzdWx0c1swXS5hZGRyZXNzX2NvbXBvbmVudHNbMV0ubG9uZ19uYW1lO1xuXG4gICAgICAgICAgICAgICAgICAgIHdlYXRoZXJGYWN0b3J5LmdldEZvcmVjYXN0RnJvbVppcGNvZGUoemlwY29kZSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3ppcGNvZGUgZm9yZWNhc3QgZGF0YTogJywgZGF0YS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JlY2FzdCA9IGRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgJHNjb3BlLiRvbignemlwY29kZVVwZGF0ZScsIGZ1bmN0aW9uKGV2ZW50LCB6aXBjb2RlKSB7XG4gICAgICAgIFxuICAgICAgICBnZXRaaXBjb2RlV2VhdGhlckFuZExvY2F0aW9uKHppcGNvZGUpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHNjb3BlLmhpZGVEYXRhRnJvbVZpZXcgPSBmYWxzZTtcbiAgICAgICAgfSwgXG4gICAgICAgIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIC8vZXJyb3IsIHNob3cgemlwY29kZSBpbnN0ZWFkXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJhbiBlcnJvciBvY2N1cmVkIGluIGdldFppcGNvZGVXZWF0aGVyQW5kTG9jYXRpb24sIFwiLCBlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
