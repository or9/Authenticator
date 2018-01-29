#!/usr/bin/env node
"use strict";

const speakeasy = require("speakeasy");
const QRCode = require("QRCode");
const redis = require("redis");
const { promisify } = require("util");

const redisClient = redis.createClient();
// const __hset = promisify(redisClient.hset.bind(redisClient));

redisClient.on("error", console.error);

module.exports = {
	create,
	verify
}

// TODO: Allow providing own redis client
function create (userName) {
	const clientSecret = speakeasy.generateSecret({
		length: 20
	});

	const qrCodeUrl = QRCode.toDataUrl();

	return new Promise((resolve, reject) => {
		const props = [ "secret", clientSecret.base32, "qrCodeUrl", qrCodeUrl ];
		console.log("calling with ", userName, props);

		redisClient.hset(userName, props, (err, response) => {
			if (err) return Promise.reject(err);

			return resolve(response);
		});
	});


}

function verify (userName, token) {
	console.log("verify by userName and token", userName, token);
	// const secret = "beans"; // load from user record in DB
	const secret = redisClient.hget(userName).secret;
	console.log("getting secret", secret);
	const encoding = "base32";

	speakeasy.totp.verify({
		secret,
		encoding,
		token
	});
}
