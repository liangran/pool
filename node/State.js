var _ = require('lodash');
var request = require("request");

function State(name){
	this.name = name;
	
	this.start_time;
	this.update_time = new Date();
	this.since_start;
	this.since_update;
	
	this.server = '';
	this.server_status = 0;
	
	this.gpus = [];
	this.gpu_num = 0;
	this.speed = 0;
	this.power = 0;
	this.accepted_shares = 0;
	this.rejected_shares = 0;
}

State.prototype.refresh = function(callback) {
	var self = this;
	request('http://127.0.0.1:42000/getstat', function(error, response, body) {
		if (!error) {
			var data = JSON.parse(body);
			self.start_time = new Date(data.start_time * 1000);
			self.server = data.current_server;
			self.server_status = data.server_status;
			
			if (!_.isEqual(self.gpus, data.result)) {
				self.gpus = data.result;
				self.gpu_num = data.result.length;
				self.update_time = new Date();
				
				self.speed = 0;
				self.power = 0;
				self.accepted_shares = 0;
				self.rejected_shares = 0;
				data.result.forEach((gpu) => {
					self.speed += gpu.speed_sps;
					self.power += gpu.gpu_power_usage;
					self.accepted_shares += gpu.accepted_shares;
					self.rejected_shares += gpu.rejected_shares;
				});
			}
			
			var now = new Date();
			self.since_start = get_time_difference(now, self.start_time);
			self.since_update = jsDateDiff(now, self.update_time);
			
			callback(null, data);
		} else {
			console.warn(body);
			console.error(error.code ? error.code : error);
			callback(error || response.statusCode, null);
		}
	});
}

State.prototype.report = function() {
	var str = this.gpu_num + ' GPUs, ' + this.speed + ' Sol/s, ' + this.power
		+ 'w, ' + this.accepted_shares + '/' + this.rejected_shares
		+ ', ' + this.since_start + ', ' + this.since_update + '更新';
	console.log(str);
}

function jsDateDiff(time_now, last_time){      
    var d_minutes,d_hours,d_days;      
    var d;      
    d = parseInt((time_now - last_time)/1000);      
    d_days = parseInt(d/86400);      
    d_hours = parseInt(d/3600);      
    d_minutes = parseInt(d/60);      
    if(d_days>0 && d_days<4){      
        return d_days+"天前";      
    }else if(d_days<=0 && d_hours>0){      
        return d_hours+"小时前";      
    }else if(d_hours<=0 && d_minutes>0){      
        return d_minutes+"分钟前";      
    }else if(d_minutes<=0 && d>=0) {
    	return d>0 ? d+"秒前" : "刚刚";
    } else{
        var s = last_time;      
        return s ? (s.getMonth()+1)+"月"+s.getDate()+"日" : null;      
    }
}

function get_time_difference(laterDate, earlierDate) {
    var oDiff = new Object();

    // Calculate Differences
    // ------------------------------------------------------------------- //
    var nTotalDiff = laterDate.getTime() - earlierDate.getTime();

    oDiff.days = Math.floor(nTotalDiff / 1000 / 60 / 60 / 24);
    nTotalDiff -= oDiff.days * 1000 * 60 * 60 * 24;

    oDiff.hours = Math.floor(nTotalDiff / 1000 / 60 / 60);
    nTotalDiff -= oDiff.hours * 1000 * 60 * 60;

    oDiff.minutes = Math.floor(nTotalDiff / 1000 / 60);
    nTotalDiff -= oDiff.minutes * 1000 * 60;

    oDiff.seconds = Math.floor(nTotalDiff / 1000);
    // ------------------------------------------------------------------- //
    // Format Duration
    // ------------------------------------------------------------------- //
    // Format Hours
    var hourtext = '00';
    if (oDiff.days > 0){ hourtext = String(oDiff.days);}
    if (hourtext.length == 1){hourtext = '0' + hourtext};

    // Format Minutes
    var mintext = '00';
    if (oDiff.minutes > 0){ mintext = String(oDiff.minutes);}
    if (mintext.length == 1) { mintext = '0' + mintext };

    // Format Seconds
    var sectext = '00';
    if (oDiff.seconds > 0) { sectext = String(oDiff.seconds); }
    if (sectext.length == 1) { sectext = '0' + sectext };

    // Set Duration
    var sDuration = hourtext + ':' + mintext + ':' + sectext;
    oDiff.duration = sDuration;
    // ------------------------------------------------------------------- //

    //return oDiff;
    return oDiff.days? oDiff.days + 'd ' + sDuration : sDuration;
}

exports.State = State;