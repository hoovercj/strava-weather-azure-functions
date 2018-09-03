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

### create-subscription
Creates a subscription with Strava for webhook events

### process-subscription
Processes webhook calls from Strava, including the initial "verification" call, and stores them in a queue

### delete-subscription
Deletes a subscription with Strava for webhook events

### process-queue
Processes strava webhook events such as new activities from a queue

### delete-account
Deletes all information related to a user
