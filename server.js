require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
var fs = require('fs');
var https = require('https');
var morganBody = require('morgan-body');

const routes = require('./src/v1/routes');
const db = require('./src/v1/shared/db');

db.init();

// HTTP server
const express = require('express');

// Allows apps on other domains to read content from ours in browser
const cors = require('cors');

// Allows express to store sessions
const session = require('express-session');
const LevelStore = require('level-session-store')(session);

// Adds ability to use data sent through POST request
const bodyParser = require('body-parser');

// Forces https using redirect
// (turned off on dev by code below, search for `app.use(yes())`)
const yes = require('yes-https');

// Load PORT environment variable from `.env` file or machine environment
// No port? No problem, use 3001 by default
const PORT = process.env.PORT || 3001;

// Load NODE_ENV environment variable from `.env` file or machine environment
let isDev = process.env.NODE_ENV !== 'production';

let configuration = {};
if (!isDev) {
    if (fs.existsSync('uatbmsbonza.intellecta.com.au.key')) {
        var privateKey = fs.readFileSync("uatbmsbonza.intellecta.com.au.key");
        var certificate = fs.readFileSync("uatbmsbonza.intellecta.com.au.crt");
        configuration = {
            key: privateKey,
            cert: certificate
        };
    } else {
        isDev = true;
    }
}

// Setup HTTP app
const app = express();

// If this is deployed to production, force using HTTPS
if (!isDev) {
    app.use(yes());
}

// Let me be seen by other apps
var corsOptions = {
    origin: function (origin, callback) {
        callback(null, true);
    },
    credentials: true
}

app.use(cors(corsOptions));

app.use(
    session({
        store: new LevelStore(),
        secret: 'bonzab0nz4bikeb1k3tourst0ur5',
        resave: true,
        rolling: true,
        cookie: {
            maxAge: 1800000, // 30 minutes
            httpOnly: false
        }
    })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/*
morganBody(app, {
    noColors: true,
    prettify: false,
    maxBodyLength: 2048
});
*/

app.use('/api/v1', routes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.static('uploads'));


// Make app live on the designated PORT
if (isDev) {
    app.listen(PORT, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${PORT}`);
    });
} else {
    var httpsServer = https.createServer(configuration, app);
    httpsServer.listen(PORT);
}
