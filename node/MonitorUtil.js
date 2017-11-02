var util = require('util');
var request = require("request");

function MonitorUtil(url) {
	this.host;
	this.proxy;
	this.options = {
		timeout : 5000
	};
	
	this.host = url || "http://120.26.101.219:90";
}

MonitorUtil.prototype.post = function(name, value) {
	var self = this;
	self.options.url = self.host;
	self.options.headers = {
		'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:30.0) Gecko/20100101 Firefox/30.0',
		'Content-Type' : 'application/json; charset=UTF-8'
	};
	self.options.method = 'POST';
	this.options.body = JSON.stringify({name: name, value: value});
	if (self.proxy) {
		self.options.proxy = self.proxy;
	}
	request(self.options, function (error, response, body) {
		if (error) {
			console.error('POST %s Fail.', error.message);
		} else {
			try{
				var data = JSON.parse(body);
				//console.log(data);
			} catch (e) {
				console.error(e);
			}
			if (response.statusCode != 200) {
				console.error('POST %s Fail.', body);
			}
		}
	});
}

exports.MonitorUtil = MonitorUtil;

//var monitor = new MonitorUtil();
//monitor.post('data', {balance: 1000})
