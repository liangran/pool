var http  = require('http');
var url   = require('url');
var util  = require('util');

var serverPort = 90;
var storage = {};

http.createServer(function(req, res) {
	try{
		if (req.method == 'GET') {
			doGet(req, res);
		} else if(req.method == "POST") {
			doPost(req, res);
		}
	} catch(e) {
		console.error(e);
		response503(res, util.inspect(e));
	}
}).listen(serverPort);
console.log('Monitor server running at localhost: ', serverPort);

function doGet(req, res) {
	var request = url.parse(req.url, true);
	var pathArr = request.pathname.split('/');
	if (pathArr.length < 1) {
		return response503(res, 'UNKNOWN PATH!!!' + util.inspect(request));
	}
	if (pathArr[1]) {
		if (storage[pathArr[1]]) {
			return responseJson(res, storage[pathArr[1]]);
		} else {
			return response503(res, "No data");
		}
	} else {
		storage.server_time = new Date();
		return responseJson(res, storage);
	}
}

function doPost(req, res) {
	var body = "";
	req.on('data', function(chunk) {
		body += chunk;
	});
	req.on('end', function() {
		try {
			console.log('POST: ' + body);
			doUpdate(req, res, body);
		} catch (err) {
			console.error("doPOST: ", err);
			res.writeHead(200, { 'Content-Type' : 'text/plain' });
			res.end();
		}
	});
	req.on('error', function() {
		console.error("post error");
	});
}

function doUpdate(req, res, body) {
	try {
		var data = JSON.parse(body);
		if (data.name && data.value) {
			storage[data.name] = {
				name  : data.name,
				value : data.value,
				last_update : new Date()
			};
			return responseJson(res, {success: true});
		} else {
			return response503(res, "Missing name or value");
		}
	} catch (e) {
		return response503(res, util.inspect(e));
	}
	
}

function responseJson(res, data) {
	res.writeHead(200, { 'Content-Type' : 'application/json; charset=UTF-8', 'Access-Control-Allow-Origin' : '*'});
	res.end(JSON.stringify(data));
}

function response503(res, msg, data) {
	res.writeHead(503, { 'Content-Type' : 'application/json', 'Access-Control-Allow-Origin' : '*'});
	data = data || {};
	data.error = msg;
	res.end(JSON.stringify(data));
}
