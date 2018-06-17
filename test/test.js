process.env.NODE_ENV = 'test';

var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('../app');
var should = chai.should();
chai.use(chaiHttp);
const pgp = require('pg-promise')();
const cn = 'postgres://postgres:@localhost:5432/vdkv'
const db = pgp(cn)

// beforeEach(function() {
// 	return db.any('TRUNCATE keys CASCADE')
// });

// afterEach(function() {
// 	return db.any('TRUNCATE keys CASCADE')
// });

describe('Set value', function() {
	it('should return value on post', function(done) {
		chai.request(app)
			.post('/object')
			.set('content-type', 'application/json')
			.send({
				'k': 'v'
			})
			.end(function(err, res) {
				res.status.should.equal(200);
				done();
			});
	});
});


describe('Get value', function() {
	it('should return value on get', function(done) {
		chai.request(app).post('/object')
			.set('content-type', 'application/json')
			.send({
				'k': 'v'
			})
			.end(() => {
				chai.request(app).get('/object/k')
					.end(function(err, res) {
						res.status.should.equal(200);
						res.body.should.have.property('value');
						res.body.value.should.equal('v');
						done();
					});
			})
	});
});

describe('Get value with timestamp', function() {
	it('should return value on get', function(done) {
		chai.request(app).post('/object')
			.set('content-type', 'application/json')
			.send({
				'k': 'v1'
			})
			.end(() => {
				sleep(1000).then(() => {
					var timestamp = new Date().getTime() / 1000 | 0;
					chai.request(app).post('/object')
						.set('content-type', 'application/json')
						.send({
							'k': 'v2'
						})
						.end(() => {
							chai.request(app).get(`/object/k?timestamp=${timestamp}`)
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
	it('should return value on get', function(done) {
		chai.request(app).post('/object')
			.set('content-type', 'application/json')
			.send({
				'k': 'v1'
			})
			.end((err, res) => {
				sleep(1000).then(() => {
					var timestamp = res.body.timestamp 
					chai.request(app).post('/object')
						.set('content-type', 'application/json')
						.send({
							'k': 'v2'
						})
						.end(() => {
							chai.request(app).get(`/object/k?timestamp=${timestamp}`)
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

// sleep time expects milliseconds
function sleep(time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}