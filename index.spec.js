#!/usr/bin/env node
"use strict";

require("chai").should();
const sinon = require("sinon");
const mockery = require("mockery");
const speakeasyModule = require("speakeasy");

var redisClient;
var userMock = {};
const speakeasy = getSpeakeasyMock();
const QRCode = getQRCodeMock();
const redis = getRedisMock();

class SEString extends String {
	constructor () {
		super();
		return this;
	}

	get base32 () {
		return "MRZUK3CUFAWHIOCYMJLEOP3GJRGW45BX";
	}
}

describe("Authenticator", () => {
	var Auth,
		sandbox;

	before(() => {
		mockery.enable({
			useCleanCache: true,
			warnOnReplace: false
		});

		mockery.registerAllowable('./index');
		mockery.registerAllowable('QRCode');
		mockery.registerAllowable('speakeasy');
		mockery.registerAllowable('redis');
		mockery.registerAllowable('util');
	})

	after(() => {
		mockery.disable();
	})

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		mockery.registerMock("QRCode", QRCode);
		mockery.registerMock("speakeasy", speakeasy);
		mockery.registerMock("redis", redis);
		Auth = require("./index");
	})

	afterEach(() => {
		sandbox.restore();
	})

	it("should exist", () => {
		Auth.should.be.an("object");
	})

	describe("#create", () => {

		it("should generate a secret", () => {
			const token = "something";
			sandbox.spy(speakeasy, "generateSecret");

			Auth.create(token);

			(speakeasy.generateSecret.called).should.be.true;
		})

		it("should request a length of 20", () => {
			const token = "something";
			sandbox.spy(speakeasy, "generateSecret");

			Auth.create(token);

			(speakeasy.generateSecret.getCall(0).args[0]).should.deep.equal({
				length: 20
			});
		})

		it("should generate a QR code data uri", () => {
			const token = "something";
			sandbox.spy(QRCode, "toDataUrl");

			Auth.create(token);
			(QRCode.toDataUrl.called).should.be.true;
		})

		it("should call redis client set with properties", () => {
			var spy = sandbox.spy(redisClient, "hset");

			Auth.create("meeee");

			const props = redisClient.hset.getCall(0).args[1];

			props.should.be.an("array");
		})

		it("should create for a given user and token", () => {
			const token = "my user token";
			const userName = "joe blow";
			sandbox.spy(redisClient, "hset");

			Auth.create(userName);

			(redisClient.hset.getCall(0).args[0]).should.equal(userName);
		})

		it("should call a provided callback", (done) => {
			const userName = "joe blow";
			sandbox.stub(redisClient, "hset").callsArg(2);

			Auth.create(userName)
				.then((response) => {
					done();
				})
				.catch(done);

		})

	})

	describe("#verify", () => {
		it("should call speakeasy's totp.verify", () => {
			const token = "something";
			const userName = "joe blow";
			Auth.create(userName);
			var spy = sandbox.spy(speakeasy.totp, "verify");

			Auth.verify(userName, token);

			(spy.called).should.be.true;

		})

		it("should verify by the user's `secret` and `token`", () => {
			const token = "something";
			const userName = "joe blow";

			var spy = sandbox.spy(speakeasy.totp, "verify");

			Auth.create(userName);
			Auth.verify(userName, token);

			const args = spy.getCall(0).args[0];

			args.secret.should.be.a("string");
			args.secret.length.should.equal(32);
			args.token.should.equal(token);
		})

		it("should use provided `secret` and `token` params for verification", () => {
			const token = "my user token";
			const userName = "bmo";

			sandbox.stub(speakeasy, "generateSecret").returns(new SEString("beans"));
			Auth.create(userName);

			var spy = sandbox.spy(speakeasy.totp, "verify");

			Auth.verify(userName, token);

			(spy.getCall(0).args[0]).should.deep.equal({
				secret: "MRZUK3CUFAWHIOCYMJLEOP3GJRGW45BX",
				encoding: "base32",
				token
			})
		})
	})
});



function getSpeakeasyMock () {
	return speakeasyModule;
}

function getQRCodeMock () {
	return {
		toDataUrl: () => "bones"
	};
}

function getRedisMock () {
	redisClient = {
		hset: (key, keyValArray) => {
			console.log("mocked redisClient key keyValArray", key, keyValArray);
			while (keyValArray.length) {
				userMock[key] = Object.assign({
					[keyValArray.shift()]: keyValArray.shift()
				}, userMock[key]);
			}
		},
		hget: (key) => {
			return userMock[key];
		},
		on: () => {}
	};

	return {
		createClient: () => {
			return redisClient;
		}
	}
}
