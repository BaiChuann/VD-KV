require('dotenv').config()
process.env.NODE_ENV = 'test';
var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('../app');
var should = chai.should();
chai.use(chaiHttp);
const pgp = require('pg-promise')();
const db_url = process.env.NODE_ENV == 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL
const db = pgp(db_url)

beforeEach(function() {
	return db.any('TRUNCATE keys CASCADE')
});

afterEach(function() {
	return db.any('TRUNCATE keys CASCADE')
});

describe('post a new key value pair', function() {
	it('should return status 200 and a key, value and timestamp', function(done) {
		chai.request(app)
			.post('/object')
			.set('content-type', 'application/json')
			.send({
				'testKey': 'testValue'
			})
			.end(function(err, res) {
				res.status.should.equal(200);
				res.body.should.have.property('key');
				res.body.should.have.property('value');
				res.body.key.should.equal('testKey')
				res.body.value.should.equal('testValue');
				res.body.should.have.property('timestamp')
				done();
			});
	});
});

describe('Get value', function() {
	it('should return the latest value on get', function(done) {
		chai.request(app).post('/object')
			.set('content-type', 'application/json')
			.send({
				'testKey': 'testValue'
			})
			.end(() => {
				chai.request(app).get('/object/testKey')
					.end(function(err, res) {
						console.log(res.body.value)
						res.status.should.equal(200);
						res.body.should.have.property('value');
						res.body.value.should.equal('testValue');
						done();
					});
			})
	});
});

describe('Get value with latest timestamp', function() {
	it('should return value before or equal that timestamp', function(done) {
		chai.request(app).post('/object')
			.set('content-type', 'application/json')
			.send({
				'testKey': 'v1'
			})
			.end(() => {
				sleep(1000).then(() => {
					chai.request(app).post('/object')
						.set('content-type', 'application/json')
						.send({
							'testKey': 'v2'
						})
						.end((err, res) => {
							var timestamp = new Date().getTime() / 1000;
							chai.request(app).get(`/object/testKey?timestamp=${timestamp}`)
								.end(function(err, res) {
									res.status.should.equal(200);
									res.body.should.have.property('value');
									res.body.value.should.equal('v2');
									done();
								});
						});
				});
			});
	});
});

describe('Get value with ealier timestamp', function() {
	it('should return previous value before or equal that timestamp', function(done) {
		chai.request(app).post('/object')
			.set('content-type', 'application/json')
			.send({
				'testKey': 'v1'
			})
			.end((err, res) => {
				sleep(1000).then(() => {
					var timestamp = res.body.timestamp + 1
					console.log(timestamp)
					chai.request(app).post('/object')
						.set('content-type', 'application/json')
						.send({
							'testKey': 'v2'
						})
						.end(() => {
							chai.request(app).get(`/object/testKey?timestamp=${timestamp}`)
								.end(function(err, res) {
									res.status.should.equal(200);
									res.body.should.have.property('value');
									res.body.value.should.equal('v1');
									done();
								});
						});
				});
			});
	});
});


function sleep(time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}