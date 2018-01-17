#!/usr/bin/env node
"use strict";

require("chai").should();
const sinon = require("sinon");
const mockery = require("mockery");

var redisClient;
const speakeasy = getSpeakeasyMock();
const QRCode = getQRCodeMock();
const redis = getRedisMock();

describe("Authenticator", () => {
	var Auth,
		sandbox;

	before(() => {
		mockery.enable({
			useCleanCache: true,
			warnOnReplace: false
		});

		mockery.registerAllowable('./index');
		mockery.registerMock("QRCode", QRCode);
		mockery.registerMock("speakeasy", speakeasy);
		mockery.registerMock("redis", redis);
		Auth = require("./index")
	})

	after(() => {
		mockery.disable();
	})

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
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

		it("should call redis client set with secret", () => {
			const EXPECTED_SECRET = "beans";
			sandbox.stub(speakeasy, "generateSecret")
				.returns(EXPECTED_SECRET);
			sandbox.spy(redisClient, "hset");

			Auth.create();

			(redisClient.hset.getCall(0).args[1])
				.should.include(EXPECTED_SECRET);
		})

		it("should call redis client `set` with user", () => {
			const token = "something";
			sandbox.spy(speakeasy, "generateSecret");
			sandbox.spy(redisClient, "hset");

			Auth.create(token);

			(redisClient.hset.getCall(0).args[0])
				.should.equal("my-test-user");
		})

		it("should call redis client set with secret", () => {
			const token = "something";
			const EXPECTED_QR_URL = "/bones";
			sandbox.stub(QRCode, "toDataUrl").returns(EXPECTED_QR_URL);
			sandbox.spy(redisClient, "hset");

			Auth.create(token);

			(redisClient.hset.getCall(0).args[1]).should.include(EXPECTED_QR_URL);
		})

	})

	describe("#verify", () => {
		it("should call speakeasy's totp.verify", () => {
			const token = "something";
			var spy = sandbox.spy(speakeasy.totp, "verify");

			Auth.verify();

			(spy.called).should.be.true;

		})

		it("should verify by the user's `secret` and `token`", () => {
			const token = "something";
			sandbox.stub(speakeasy, "generateSecret").returns("beans");
			var spy = sandbox.spy(speakeasy.totp, "verify");

			Auth.verify();

			(spy.getCall(0).args[0]).should.deep.equal({
				secret: "beans",
				encoding: "base32",
				token: token
			})
		})
	})
});



function getSpeakeasyMock () {
	return {
		generateSecret: () => "beans",
		totp: {
			verify: () => {}
		}
	};
}

function getQRCodeMock () {
	return {
		toDataUrl: () => "bones"
	};
}

function getRedisMock () {
	redisClient = {
		hset: () => {},
		on: () => {}
	};

	return {
		createClient: () => {
			return redisClient;
		}
	}
}
