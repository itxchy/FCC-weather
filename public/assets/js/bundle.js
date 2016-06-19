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
//# sourceMappingURL=data:application/json;base64,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VUFBVSxJQUFWLEVBQWdCOztBQUVyQixXQUFPLE9BQVAsR0FBaUIsS0FBSyxJQUF0QjtBQUNBLFFBQUksWUFBWSxPQUFPLE9BQVAsQ0FBZSxPQUFmLENBQXVCLENBQXZCLEVBQTBCLEVBQTFDO0FBQ0EsV0FBTyxJQUFQLEdBQWMsZUFBZSxzQkFBZixDQUFzQyxTQUF0QyxDQUFkOztBQUVBLFFBQUksQ0FBQyxJQUFMLEVBQVc7QUFDVixZQUFPLEtBQVA7QUFDQTs7QUFFRCxhQUFTLHNCQUFULENBQWdDLE9BQWhDLEVBQ0MsSUFERCxDQUNNLFVBQVMsSUFBVCxFQUFlOztBQUVwQixhQUFRLEdBQVIsQ0FBWSx1QkFBWixFQUFxQyxJQUFyQztBQUNBLFlBQU8sUUFBUCxHQUFrQixLQUFLLElBQUwsQ0FBVSxPQUFWLENBQWtCLENBQWxCLEVBQXFCLGtCQUFyQixDQUF3QyxDQUF4QyxFQUEyQyxTQUE3RDs7QUFFQSxvQkFBZSxzQkFBZixDQUFzQyxPQUF0QyxFQUNDLElBREQsQ0FDTSxVQUFTLElBQVQsRUFBZTtBQUNwQixjQUFRLEdBQVIsQ0FBWSx5QkFBWixFQUF1QyxLQUFLLElBQTVDO0FBQ0EsYUFBTyxRQUFQLEdBQWtCLEtBQUssSUFBdkI7QUFDQSxjQUFRLElBQVI7QUFFQSxNQU5EO0FBT0EsS0FiRDtBQWNBLElBekJEO0FBMEJBLEdBNUJNLENBQVA7QUE2QkE7O0FBRUQsUUFBTyxHQUFQLENBQVcsZUFBWCxFQUE0QixVQUFTLEtBQVQsRUFBZ0IsT0FBaEIsRUFBeUI7O0FBRXBELCtCQUE2QixPQUE3QixFQUNDLElBREQsQ0FDTSxZQUFXO0FBQ2hCLFVBQU8sZ0JBQVAsR0FBMEIsS0FBMUI7QUFDQSxHQUhELEVBSUEsVUFBUyxLQUFULEVBQWdCOzs7QUFHZixHQVBEO0FBUUEsRUFWRDtBQVdBLENBckdEIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuXG4vKioqKioqIEFuZ3VsYXJqcyAqKioqKiovXG52YXIgd2VhdGhlckFwcCA9IGFuZ3VsYXIubW9kdWxlKCd3ZWF0aGVyQXBwJywgW10pO1xuXG53ZWF0aGVyQXBwLmZhY3RvcnkoJ2xvY2F0aW9uJywgZnVuY3Rpb24oJHEsICRodHRwKSB7XG5cblx0dmFyIGNsaWVudE9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG5cdHZhciBsYXQgPSBudWxsO1xuXHR2YXIgbG9uZyA9IG51bGw7XG5cdHZhciB6aXBjb2RlID0gbnVsbDtcblxuXHRyZXR1cm4ge1xuXG5cdFx0Z2V0R2VvQ29vcmRzOiBmdW5jdGlvbigpIHtcblxuXHRcdFx0cmV0dXJuICRxKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuXG5cdFx0XHRcdGlmKG5hdmlnYXRvci5nZW9sb2NhdGlvbikge1xuXG5cdFx0XHRcdFx0Ly8gaWYgc3VjY2Vzc2Z1bCwgcmVzb2x2ZSB0aGUgcHJvbWlzZSB3aXRoIHRoZSBwb3NpdGlvbiBvYmplY3Rcblx0XHRcdFx0XHRuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShwb3NpdGlvbik7XG5cdFx0XHRcdFx0fSwgXG5cblx0XHRcdFx0XHQvLyBpZiB0aGVyZSdzIGFuIGVycm9yLCByZWplY3QgdGhlIHByb21pc2UgYW5kIHBhc3MgdGhlIGVycm9yIGFsb25nXG5cdFx0XHRcdFx0ZnVuY3Rpb24gKGVycm9yKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcmVqZWN0KGVycm9yKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBcblxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVqZWN0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHR1cGRhdGVaaXBjb2RlOiBmdW5jdGlvbih6aXBjb2RlKSB7XG5cdFx0XHR0aGlzLnppcGNvZGUgPSB6aXBjb2RlO1xuXHRcdFx0cmV0dXJuIHRoaXMuemlwY29kZTtcblx0XHR9LFxuXG5cdFx0LyoqKioqKiogQ2FsbHMgR29vZ2xlIE1hcCdzIEFQSSwgcmV0dXJucyBsb2NhdGlvbiBkZXRhaWxzIGJhc2VkIG9uIGdlbyBjb29yZGluYXRlcyAqKioqKioqL1xuXHRcdGdldEdlb0xvY2F0aW9uTmFtZTogZnVuY3Rpb24obGF0LCBsb25nKSB7XG5cblx0XHRcdHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvbG9jYXRpb24vZ2VvbG9jYXRpb24/bGF0PSR7bGF0fSZsb25nPSR7bG9uZ31gKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihsb2NhdGlvbkRhdGEpIHtcblxuXHRcdFx0XHRcdGlmIChhbmd1bGFyLmlzT2JqZWN0KGxvY2F0aW9uRGF0YSkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBsb2NhdGlvbkRhdGE7XG5cdFx0XHRcdFx0fSBcblxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuICRxLnJlamVjdChsb2NhdGlvbkRhdGEpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGdldFppcGNvZGVMb2NhdGlvbk5hbWU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcblxuXHRcdFx0cmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9sb2NhdGlvbi96aXBjb2RlP3ppcGNvZGU9JHt6aXBjb2RlfWApXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKGxvY2F0aW9uRGF0YSkge1xuXG5cdFx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNPYmplY3QobG9jYXRpb25EYXRhKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGxvY2F0aW9uRGF0YTtcblx0XHRcdFx0XHR9IFxuXG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJHEucmVqZWN0KGxvY2F0aW9uRGF0YSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0emlwY29kZTogemlwY29kZSxcblx0XHRsYXQ6IGxhdCxcblx0XHRsb25nOiBsb25nXG5cdH07XG59KTtcblxud2VhdGhlckFwcC5mYWN0b3J5KCd3ZWF0aGVyRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwLCAkcSkge1xuXHR2YXIgY2xpZW50T3JpZ2luID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcblx0dmFyIHdlYXRoZXJPYmplY3QgPSBudWxsO1xuXG5cdHJldHVybiB7XG5cdFx0LyoqKioqKiogQ2FsbHMgT3BlbldlYXRoZXJNYXAncyBBUEksIHJldHVybnMgY3VycmVudCB3ZWF0aGVyIGRhdGEgKioqKioqKi9cblx0XHRnZXRXZWF0aGVyRnJvbUdlb0Nvb3JkczogZnVuY3Rpb24obGF0LCBsb25nKSB7XG5cblx0XHRcdHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvd2VhdGhlci9nZW9jb29yZHM/bGF0PSR7bGF0fSZsb25nPSR7bG9uZ31gKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbih3ZWF0aGVyRGF0YSkge1xuXG5cdFx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNPYmplY3Qod2VhdGhlckRhdGEpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gd2VhdGhlckRhdGE7XG5cdFx0XHRcdFx0fSBcblxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuICRxLnJlamVjdCh3ZWF0aGVyRGF0YSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0Z2V0V2VhdGhlckZyb21aaXBjb2RlOiBmdW5jdGlvbih6aXBjb2RlKSB7XG5cblx0XHRcdHJldHVybiAkaHR0cC5nZXQoYCR7Y2xpZW50T3JpZ2lufS9hcGkvd2VhdGhlci96aXBjb2RlP3ppcGNvZGU9JHt6aXBjb2RlfWApXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHdlYXRoZXJEYXRhKSB7XG5cblx0XHRcdFx0XHRpZiAoYW5ndWxhci5pc09iamVjdCh3ZWF0aGVyRGF0YSkpIHtcblx0XHRcdFx0XHRcdHJldHVybiB3ZWF0aGVyRGF0YTtcblx0XHRcdFx0XHR9IFxuXG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJHEucmVqZWN0KHdlYXRoZXJEYXRhKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHQvKioqKioqKiBDYWxscyBPcGVuV2VhdGhlck1hcCdzIEFQSSwgcmV0dXJucyA3IGRheSBmb3JjYXN0ICoqKioqKiovICAgXG5cdFx0Z2V0Rm9yZWNhc3RGcm9tR2VvQ29vcmRzOiBmdW5jdGlvbihsYXQsIGxvbmcpIHtcblxuXHRcdFx0cmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9mb3JlY2FzdC9nZW9jb29yZHM/bGF0PSR7bGF0fSZsb25nPSR7bG9uZ31gKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihmb3JlY2FzdERhdGEpIHtcblxuXHRcdFx0XHRcdGlmIChhbmd1bGFyLmlzT2JqZWN0KGZvcmVjYXN0RGF0YSkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmb3JlY2FzdERhdGE7XG5cdFx0XHRcdFx0fSBcblxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuICRxLnJlamVjdChmb3JlY2FzdERhdGEpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGdldEZvcmVjYXN0RnJvbVppcGNvZGU6IGZ1bmN0aW9uKHppcGNvZGUpIHtcblxuXHRcdFx0cmV0dXJuICRodHRwLmdldChgJHtjbGllbnRPcmlnaW59L2FwaS9mb3JlY2FzdC96aXBjb2RlP3ppcGNvZGU9JHt6aXBjb2RlfWApXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKGZvcmVjYXN0RGF0YSkge1xuXG5cdFx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNPYmplY3QoZm9yZWNhc3REYXRhKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZvcmVjYXN0RGF0YTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdHJldHVybiAkcS5yZWplY3QoZm9yZWNhc3REYXRhKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRpbml0aWFsaXplV2VhdGhlckljb25zOiBmdW5jdGlvbih3ZWF0aGVySWQpIHtcblxuXHRcdFx0LyoqKioqKiogV1ggSWNvbnMgKioqKioqKi9cblx0XHRcdHZhciBpY29uID0gXCJ3aS1uYVwiO1xuXG5cdFx0XHR2YXIgY3VycmVudElEID0gd2VhdGhlcklkO1xuXG5cdFx0XHQvLyBUaHVuZGVyc3Rvcm1cblx0XHRcdGlmICggY3VycmVudElEID49IDIwMCAmJiBjdXJyZW50SUQgPD0gMjMyICkge1xuXHRcdFx0XHRpY29uID0gJ3dpLWRheS10aHVuZGVyc3Rvcm0nO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBEcml6emxlIFxuXHRcdFx0aWYgKCBjdXJyZW50SUQgPj0gMzAwICYmIGN1cnJlbnRJRCA8PSAzMjEgKSB7XG5cdFx0XHRcdGljb24gPSAnd2ktZGF5LXNob3dlcnMnO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBSYWluXG5cdFx0XHRpZiAoIGN1cnJlbnRJRCA+PSA1MDAgJiYgY3VycmVudElEIDw9IDUzMSApIHtcblx0XHRcdFx0aWNvbiA9ICd3aS1kYXktcmFpbic7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNub3dcblx0XHRcdGlmICggY3VycmVudElEID49IDYwMCAmJiBjdXJyZW50SUQgPD0gNjIyICkge1xuXHRcdFx0XHRpY29uID0gJ3dpLWRheS1zbm93Jztcblx0XHRcdH1cblxuXHRcdFx0Ly8gQXRtb3NwaGVyZSAoZm9nLCBoYXplLCBldGMuKSBcblx0XHRcdGlmICggY3VycmVudElEID49IDcwMSAmJiBjdXJyZW50SUQgPD0gNzgxICkge1xuXHRcdFx0XHRpY29uID0gJ3dpLWRheS1mb2cnO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTdW5cblx0XHRcdGlmICggY3VycmVudElEID09PSA4MDAgfHwgY3VycmVudElEID09PSA4MDEgKSB7XG5cdFx0XHRcdGljb24gPSAnd2ktZGF5LXN1bm55Jztcblx0XHRcdH1cblxuXHRcdFx0Ly8gQ2xvdWRzXG5cdFx0XHRpZiAoIGN1cnJlbnRJRCA+PSA4MDIgJiYgY3VycmVudElEIDw9IDgwNCApIHtcblx0XHRcdFx0aWNvbiA9ICd3aS1kYXktY2xvdWR5Jztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGljb247XG5cdFx0fVxuXHR9O1xufSk7XG5cbndlYXRoZXJBcHAuY29udHJvbGxlcignemlwY29kZScsIFsnJHNjb3BlJywgJyRyb290U2NvcGUnLCAnbG9jYXRpb24nLCBmdW5jdGlvbigkc2NvcGUsICRyb290U2NvcGUsIGxvY2F0aW9uKSB7XG5cblx0JHNjb3BlLnppcGNvZGVDbGlja0hhbmRsZXIgPSBmdW5jdGlvbigpIHtcblxuXHRcdGxvY2F0aW9uLnVwZGF0ZVppcGNvZGUoJHNjb3BlLnppcGNvZGUpO1xuXG5cdFx0Ly8gZmlyZXMgYSAnemlwY29kZSByZWNlaXZlZCcgZXZlbnQgd2l0aCB0aGlzICRzY29wZSdzIHppcGNvZGUgYXMgYXMgYXJnXG5cdFx0JHJvb3RTY29wZS4kYnJvYWRjYXN0KCd6aXBjb2RlVXBkYXRlJywgJHNjb3BlLnppcGNvZGUpO1xuXHR9O1xufV0pO1xuXG53ZWF0aGVyQXBwLmNvbnRyb2xsZXIoJ3dlYXRoZXJDdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgd2VhdGhlckZhY3RvcnksIGxvY2F0aW9uLCAkcSkge1xuXG5cdCRzY29wZS5oaWRlRGF0YUZyb21WaWV3ID0gdHJ1ZTtcblxuXHRmdW5jdGlvbiBnZXRHZW9XZWF0aGVyQW5kTG9jYXRpb24oKSB7XG5cblx0XHRyZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG5cdFx0XHR3ZWF0aGVyRmFjdG9yeS5nZXRXZWF0aGVyRnJvbUdlb0Nvb3Jkcyhsb2NhdGlvbi5sYXQsIGxvY2F0aW9uLmxvbmcpXG5cdFx0XHQudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuXG5cdFx0XHRcdCRzY29wZS53ZWF0aGVyID0gZGF0YS5kYXRhO1xuXHRcdFx0XHR2YXIgd2VhdGhlcklkID0gJHNjb3BlLndlYXRoZXIud2VhdGhlclswXS5pZDtcblx0XHRcdFx0JHNjb3BlLmljb24gPSB3ZWF0aGVyRmFjdG9yeS5pbml0aWFsaXplV2VhdGhlckljb25zKHdlYXRoZXJJZCk7XG5cblx0XHRcdFx0aWYgKCFkYXRhKSB7XG5cdFx0XHRcdFx0cmVqZWN0KCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsb2NhdGlvbi5nZXRHZW9Mb2NhdGlvbk5hbWUobG9jYXRpb24ubGF0LCBsb2NhdGlvbi5sb25nKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihkYXRhKSB7XG5cblx0XHRcdFx0XHQkc2NvcGUubG9jYXRpb24gPSBkYXRhLmRhdGEucmVzdWx0c1s1XS5hZGRyZXNzX2NvbXBvbmVudHNbMF0ubG9uZ19uYW1lO1xuXHRcdFx0XHRcdHdlYXRoZXJGYWN0b3J5LmdldEZvcmVjYXN0RnJvbUdlb0Nvb3Jkcyhsb2NhdGlvbi5sYXQsIGxvY2F0aW9uLmxvbmcpXG5cdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXG5cdFx0XHRcdFx0XHQkc2NvcGUuZm9yZWNhc3QgPSBkYXRhLmRhdGE7XG5cdFx0XHRcdFx0XHRyZXNvbHZlKGRhdGEpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0bG9jYXRpb24uZ2V0R2VvQ29vcmRzKClcblx0LnRoZW4oZnVuY3Rpb24ocG9zaXRpb24pIHtcblxuXHRcdGxvY2F0aW9uLmxhdCA9IHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZTtcblx0XHRsb2NhdGlvbi5sb25nID0gcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZTtcblxuXHRcdGdldEdlb1dlYXRoZXJBbmRMb2NhdGlvbigpXG5cdFx0LnRoZW4oZnVuY3Rpb24oKSB7XG5cblx0XHRcdCRzY29wZS5oaWRlRGF0YUZyb21WaWV3ID0gZmFsc2U7XG5cdFx0fSwgXG5cblx0XHRmdW5jdGlvbihlcnJvcikge1xuXHRcdC8vZXJyb3IsIHNob3cgemlwY29kZSBpbnN0ZWFkXG5cdFx0fSk7XG5cblx0XHR9LCBmdW5jdGlvbihlcnJvcikge1xuXHRcdFx0cmV0dXJuIGVycm9yO1xuXHR9KTtcblxuXHQvLyBmdW5jdGlvbiBmb3IgdGhlIGV2ZW50IGxpc3RlbmVyXG5cdC8vIHdoZW4gYSAnemlwY29kZSByZWNlaXZlZCcgZXZlbnQgYXBwZWFycywgXG5cdC8vIHRoaXMgZnVuY3Rpb24gZmlyZXMuXG5cdGZ1bmN0aW9uIGdldFppcGNvZGVXZWF0aGVyQW5kTG9jYXRpb24oemlwY29kZSkge1xuXG5cdFx0cmV0dXJuICRxKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuXHRcdFx0d2VhdGhlckZhY3RvcnkuZ2V0V2VhdGhlckZyb21aaXBjb2RlKHppcGNvZGUpXG5cdFx0XHQudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuXG5cdFx0XHRcdCRzY29wZS53ZWF0aGVyID0gZGF0YS5kYXRhO1xuXHRcdFx0XHR2YXIgd2VhdGhlcklkID0gJHNjb3BlLndlYXRoZXIud2VhdGhlclswXS5pZDtcblx0XHRcdFx0JHNjb3BlLmljb24gPSB3ZWF0aGVyRmFjdG9yeS5pbml0aWFsaXplV2VhdGhlckljb25zKHdlYXRoZXJJZCk7XG5cblx0XHRcdFx0aWYgKCFkYXRhKSB7XG5cdFx0XHRcdFx0cmVqZWN0KGVycm9yKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGxvY2F0aW9uLmdldFppcGNvZGVMb2NhdGlvbk5hbWUoemlwY29kZSlcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3ppcGNvZGUgbG9jYXRpb24gZGF0YScsIGRhdGEpO1xuXHRcdFx0XHRcdCRzY29wZS5sb2NhdGlvbiA9IGRhdGEuZGF0YS5yZXN1bHRzWzBdLmFkZHJlc3NfY29tcG9uZW50c1sxXS5sb25nX25hbWU7XG5cblx0XHRcdFx0XHR3ZWF0aGVyRmFjdG9yeS5nZXRGb3JlY2FzdEZyb21aaXBjb2RlKHppcGNvZGUpXG5cdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3ppcGNvZGUgZm9yZWNhc3QgZGF0YTogJywgZGF0YS5kYXRhKTtcblx0XHRcdFx0XHRcdCRzY29wZS5mb3JlY2FzdCA9IGRhdGEuZGF0YTtcblx0XHRcdFx0XHRcdHJlc29sdmUoZGF0YSk7XG5cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdCRzY29wZS4kb24oJ3ppcGNvZGVVcGRhdGUnLCBmdW5jdGlvbihldmVudCwgemlwY29kZSkge1xuXHRcdFxuXHRcdGdldFppcGNvZGVXZWF0aGVyQW5kTG9jYXRpb24oemlwY29kZSlcblx0XHQudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdCRzY29wZS5oaWRlRGF0YUZyb21WaWV3ID0gZmFsc2U7XG5cdFx0fSwgXG5cdFx0ZnVuY3Rpb24oZXJyb3IpIHtcblx0XHQvL2Vycm9yLCBzaG93IHppcGNvZGUgaW5zdGVhZFxuXHRcdC8vY29uc29sZS5sb2coXCJhbiBlcnJvciBvY2N1cmVkIGluIGdldFppcGNvZGVXZWF0aGVyQW5kTG9jYXRpb24sIFwiLCBlcnJvcik7XG5cdFx0fSk7XG5cdH0pO1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
