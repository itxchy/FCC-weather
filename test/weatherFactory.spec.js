describe('weatherFactory', function() {
	var weatherFactory;

	beforeEach(module('weatherApp'));

	beforeEach(inject(function(_weatherFactory_,$rootScope) {
		weatherFactory = _weatherFactory_;
		scope = $rootScope.$new();
	}));


	it('initializeWeatherIcons: should return correct icon', function() {
		expect(weatherFactory.initializeWeatherIcons(210)).toBe('wi-day-thunderstorm');
	});
});
