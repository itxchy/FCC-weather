# FCC-weather
A simple weather app, built with Angular 1 and Express 4.

This was an intermediate front end development project for Free Code Camp.

If this app is served through https, it will be able to retrieve your exact location through HTML5's geolocation API and present your current weather conditions and location immediately, with your permission of course. Then, you can enter any zipcode you'd like to get the current weather anywhere!

If served through http, you will need to enter a zipcode. Starting with Chrome version 50, the Geolocation API is not allowed for insecure origins. 

## Installation

Clone this repo.

`npm install`

`gulp serve`

## Gulp commands

`gulp` 
Compiles the public build. 
This project uses `SCSS`, and the `js` will be compiled by Babel. 

`gulp serve`
Compiles the public build *and* runs the Express server proxying through Browsersync.
JavaScript edits will automatically restart the server, and style edits will be injected instantly. No refreshing necessary 

`gulp test`
Runs the test suite once.

`gulp tdd`
Runs the test suite in watch mode. All JavaScript edits will re-run the test suite. 

## API Key

**IMPORTANT**: This app requires a valid API key from OpenWeatherMap to make the required API calls. [Sign up for your free API key right here!](http://openweathermap.org/appid)

Once you have your personal API key, you'll need to create a `.env` file in the root directory.

This project uses an NPM module called `node-env-file` to initialize environment variables. In our case, we'll be storing our secret API key on the host machine as an environment variable so the client can't access it.

If you look at `server.js` on line 9, the key is stored on the host machine at `process.env.OPEN_WEATHER_API_KEY`.

To initialize `OPEN_WEATHER_API_KEY`, enter the following into your `.env` file.

```bash
OPEN_WEATHER_API_KEY=abcfakeapikey424242424242
```

Replace that totally-legit-looking key with your own.
