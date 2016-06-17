describe('angular', function() {

	it('angular should be defined', function() {
		expect(angular).toBeDefined();
	});

	it('module should be defined', function() {
		expect(module).toBeDefined();
	});
});

describe('location', function() {
	var location;

	beforeEach(module('weatherApp'));

	beforeEach(inject(function(_location_) {
		location = _location_;
	}));

	it('getGeoCoords: should return lat and long on success', function() {

		spyOn(navigator.geolocation,"getCurrentPosition").and.callFake(function() {
			var position = {coords: { latitude: 44, longitude: 43 } };
			arguments[0](position);
		});

		location.getGeoCoords()
			.then(function (position) {
				coords = position;
				expect(position).toBeDefined();
				expect(position.coords.lat).toEqual(44);
				expect(position.coords.long).toEqual(43);
				return position;
			}, function (error) {
				return error;
			});
	});

	it('getZipCode should return location.zipcode matching zipcode', function() {

		var zipcodeCheck = location.updateZipcode(60660);
		location.updateZipcode(60660);

		expect(zipcodeCheck).toBe(60660);
		expect(location.zipcode).toBe(60660);
	});

});
