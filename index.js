#!/usr/bin/env node
"use strict";

const speakeasy = require("speakeasy");
const QRCode = require("QRCode");
const redis = require("redis");

const redisClient = redis.createClient();
redisClient.on("error", console.error);

var secret = "";
var token = "";

module.exports = {
	create,
	verify
}

function create () {
	const clientSecret = speakeasy.generateSecret({
		length: 20
	});

	const qrCodeUrl = QRCode.toDataUrl();

	redisClient.hset("my-test-user", [
	         "secret", clientSecret,
	         "qrCodeUrl", qrCodeUrl
	])

}

function verify () {
	const secret = "beans";
	const encoding = "base32";
	const token = "something";

	speakeasy.totp.verify({
		secret,
		encoding,
		token
	});
}
