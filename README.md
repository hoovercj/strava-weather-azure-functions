# Strava Weather Functions
This repository contains the functions needed to run the backend for my Strava Weather service.

## Functions
### auth
Handles exchanging oath codes for auth tokens for the Strava api

### activities
Returns a list of activities for the authorized user.
This is currently unused and is a candidate for deletion.

### get-description-with-weather
Gets detailed activity information such as time and location and uses that to build a weather summary. It then appends that to the description of the activity and returns it to the user.

If the method was "post", it also updates the activity on Strava to the description with weather.
