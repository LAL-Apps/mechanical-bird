Readme
================================

Usage
-------------------------
1. Clone the project:

        git clone https://github.com/LAL-Apps/mechanical-bird.git

2. If you don't have a Twitter app yet create one at https://dev.twitter.com/apps
3. Edit the **app.js** and enter the Twitter credentials from your app:

        var T = new twit({
            consumer_key:         '...'//put your consumer_key here
          , consumer_secret:      '...'//put your consumer_secret here
          , access_token:         '...'//put your access_token here
          , access_token_secret:  '...'//put your access_token_secret here
        })

4. Start the app with node.js:

        node app.js

5. You probably want to check the first part of the **app.js** to change the configuration


Live example
-------------------------
To watch the script in action check out this twitter account: https://twitter.com/MechHummingbird


Run the app on a server
-------------------------
If you want to run the app 24/7 on a server and do not have one you can create a free account on https://www.appfog.com/ and run the app there. The app has been tested there and should work
