# Chat-app


-The application enables users to register themselves using a unique email.

-Once registered, the users are able to login and their dashboard view will be presented.

-On the top right corner of the dashboard are three icons that allow the user to add contacts, check their friend requests, and logout.

-On the left side appears a contact list with three tabs to display the online contacts, offline contacts and a list of all contacts.

-Conversations are opened by  clicking on one of their contacts.

-The conversation view has an icon on the right corner of the header that allows the users to add a contact to the conversation. On the left corner of the header appears another icon that opens up a canvas for the user to send scribbles.
  
## Front end

the front end of the application was developed using angular and angular-material

## Back end

For the back end there is an express.js server working together  with a socket.io and a mongoDB database managed using mongoose module.

session management was done using exprss-sessions.


##The Front end files:

-Views are directly on the public folder and “index.html” is the landing page.

-Scripts are found on public/javascripts  and “main-app.js” contains the functionality of the application.


##The Back end files:

-The “app.js” file creates the express server and contains the middleware.

-The main back end logic is located on the routes folder.

     *routes/index.js  handles the http request.

     *routes/sockets.js handles the websocket communication.

-The data schemas for the database are located on the models folder
