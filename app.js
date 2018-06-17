require('dotenv').config()
const express = require('express')
const app = express()
const pgp = require('pg-promise')();
const db_url = process.env.NODE_ENV == 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL
const db = pgp(db_url)
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

app.get('/', (req, res) => res.send('Hello World!'))

var server = app.listen(3000, () => console.log('Example app listening on port 3000!'))

app.post('/object', jsonParser, function(req, res) {
    var key = Object.keys(req.body)[0];
    var value = req.body[key]
    db.tx(t => {
        return db.one('WITH key_insert AS (INSERT INTO keys (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2 RETURNING id) INSERT INTO history_values VALUES ((select id from key_insert), $2) RETURNING extract(epoch from timestamp)', [key, value]);
    })
    .then((result) => {
        var response_obj = {
            key: key,
            value: value,
            timestamp: result.date_part
        };

        res.send(response_obj);
    })
    .catch(error => {
        server_error_handler(res, error);
    });
});

app.get('/object/:key', function(req, res) {
    var key = req.params.key;
    var timestamp = req.query.timestamp;
	db.task(t => {
        if (timestamp) {
            return t.oneOrNone('SELECT H.value FROM keys K INNER JOIN history_values H ON (K.id = H.key_id) WHERE key = $1 AND extract(epoch from H.timestamp) <= $2 ORDER BY H.timestamp DESC LIMIT 1', [key, timestamp])
        } else {
            return t.oneOrNone('SELECT value FROM keys WHERE key = $1', key)
        }
    })
    .then(result => {
        if (result) {
            var response_obj = {
                value: result.value,
            };

            res.send(response_obj);
        } else {
            not_found_handler(res);
        }
    })
    .catch(error => {
        server_error_handler(res, error);
    });
});


function not_found_handler(res) {
	res.status(404).send({
		error: 'value not set yet!'
	});
}

function server_error_handler(res, error) {
	res.status(500).send({
		error: error.message
	});
}

module.exports = server