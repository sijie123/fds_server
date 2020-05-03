### Introduction
This is the server-side component of the FDS App.
The server-side accepts requests from the user and interfaces with the database using the pg-promise library.

### Pre-requisites
You need the following software to run this application.
1. PostgreSQL
  - You need to install PostgreSQL.
  - [IMPT!] Follow instructions from the database deployment instructions to initialize the database.
2. NodeJS
  - You need to install NodeJS and NPM. 
    - Windows users can refer to installation instructions [here](https://www.guru99.com/download-install-node-js.html).
    - Ubuntu users can refer to installation instructions [here](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-18-04).

### Deployment Instructions
1. Checkout this git repository (or unzip the zip file) and enter the folder.
2. Run `npm install`.
3. Create a Postgres Database, taking note of the credentials and the database name.
4. Rename `config.sample.js` to `config.js`. Update the file to use the correct setup for your deployment.
5. Run `npm start` to start the server-side component.
6. Navigate to http://*SERVER_IP*:*BACKEND_PORT*. If you can see the Hello World message, your server-side deployment is ready to go.

Refer to the client-side deployment instructions to setup the front-end. 
Also refer to the database deployment instructions to initialise the database.
After setting up the front-end, back-end and database deployments, you can begin using the FDS App.

### About
This FDS App is created by Team 57: Lin Si Jie, Jonathan Cheng, Hilda Ang, Ong Ai Hui for the purposes of CS2102.
