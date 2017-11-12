var myApp = angular.module('myApp', []);

myApp.run(['$rootScope', function($rootScope) {
	console.log('init');
}]);

myApp.controller('MyController', function($scope, $interval, $http) {
	var zcl_api = "http://upool.cc/api/worker_stats?t1JxC6aaWzJ6jESwW4SCqVSWf8YyJvXqZ7Q";
	var zec_api = "https://api-zcash.flypool.org/miner/t1NajHvjBQtndnn1VEzY5r4xgYihZ8e5bE2/workers?miner=t1NajHvjBQtndnn1VEzY5r4xgYihZ8e5bE2";
	var gpu_api = "http://120.26.101.219:90";
	
	var price_api = "https://api.coinmarketcap.com/v1/ticker/?convert=CNY&limit=400";
	
	var workers = ['jg001', 'jg002', 'jg003'];
	for (var i=1; i<=23; i++) {
		var str = '0' + i;
		workers.push('jg1' + str.substring(str.length - 2));
	}
	for (var i=1; i<=28; i++) {
		var str = '0' + i;
		workers.push('jg2' + str.substring(str.length - 2));
	}
	workers.push('jg999');
	workers.push('jg999zec');
	
	$scope.miners = {};
	workers.forEach(function(name){
		$scope.miners[name] = {
			name     : name,
			coin     : null,
			hashrate : null,
			avghash  : null,
			rateunit : '',
			shares   : null,
			time     : null,
			lasttime : null,
			desc     : null,
			state    : 'pending',
			gpu_num    : 0,
			gpu_fail   : 0,
			gpu_1063   : 0,
			gpu_p106   : 0,
			gpu_desc   : '',
			gpu_thigh  : 0,
			gpu_tlow   : 0,
			gpu_speed  : 0,
			gpu_accept : null,
			gpu_reject : null,
			gpu_start  : null,
			gpu_since  : null,
			gpu_update_desc : null,
			gpu_timeout : false
		}
	});
	
	$scope.pools = {
		ZCL : {alive: 0, hashrate: 0, gpu_speed:0, gpu_num:0, gpu_1063:0, gpu_p106:0, refreshing: false},
		ZEC : {alive: 0, hashrate: 0, gpu_speed:0, gpu_num:0, gpu_1063:0, gpu_p106:0, refreshing: false},
		ETH : {alive: 0, hashrate: 0, gpu_speed:0, gpu_num:0, gpu_1063:0, gpu_p106:0, refreshing: false}
	}
	$scope.after = function(coin) {
		$scope.pools[coin].alive = 0;
		$scope.pools[coin].hashrate = 0;
		$scope.pools[coin].gpu_speed = 0;
		$scope.pools[coin].gpu_num = 0;
		$scope.pools[coin].gpu_1063 = 0;
		$scope.pools[coin].gpu_p106 = 0;
		for(var name in $scope.miners) {
			var worker = $scope.miners[name];
			if (coin == 'ZCL' && worker.coin == coin && worker.state == 'on') {
				$scope.pools[coin].alive++;
				$scope.pools[coin].gpu_num   += (worker.gpu_num ? worker.gpu_num : 0);
				$scope.pools[coin].gpu_1063  += (worker.gpu_1063 ? worker.gpu_1063 : 0);
				$scope.pools[coin].gpu_p106  += (worker.gpu_p106 ? worker.gpu_p106 : 0);
				$scope.pools[coin].gpu_speed += (worker.gpu_speed ? worker.gpu_speed : 0);
				if (worker.rateunit == 'KSol/s') {
					$scope.pools[coin].hashrate = $scope.pools[coin].hashrate + parseFloat(worker.hashrate);
				} else {
					$scope.pools[coin].hashrate = $scope.pools[coin].hashrate + parseFloat(worker.hashrate)  / 1024;
				}
			}
			if (coin == 'ZEC' && worker.coin == coin && worker.state == 'on') {
				if (name.indexOf('jg999zec') < 0) { 
					$scope.pools[coin].alive++;
				}
				$scope.pools[coin].gpu_num   += (worker.gpu_num ? worker.gpu_num : 0);
				$scope.pools[coin].gpu_1063  += (worker.gpu_1063 ? worker.gpu_1063 : 0);
				$scope.pools[coin].gpu_p106  += (worker.gpu_p106 ? worker.gpu_p106 : 0);
				$scope.pools[coin].gpu_speed += (worker.gpu_speed ? worker.gpu_speed : 0);
				$scope.pools[coin].hashrate += worker.hashrate ? parseFloat(worker.hashrate) : 0;
			}
		}
	}
	
	$scope.timer = {
		timer : 0,
		last_time : null,
		seconds : 0
	}
	$scope.auto = function() {
		if ($scope.timer.timer) {
			$interval.cancel($scope.timer.timer);
			$scope.timer.timer = 0;
		} else {
			$scope.timer.timer = $interval(function(){
				var now = new Date();
				if (!$scope.timer.last_time || $scope.timer.seconds > 30) {
					$scope.refresh();
					$scope.timer.last_time = now;
				}
				$scope.timer.seconds = (now - $scope.timer.last_time)/1000;
			}, 1000);
		}
	}
	$scope.auto();
	
	$scope.refreshZCL = function(callback) {
		$scope.pools['ZCL'].refreshing = true;
		var refresh_time = new Date();
		getResource(zcl_api, function(err, data){
			$scope.pools['ZCL'].refreshing = false;
			if (err) {
				console.error(err);
			} else {
				for (var key in data.workers) {
					var item = data.workers[key];
					var name = key.split('.')[1];
					if (!$scope.miners[name]) {
						item.worker = 'ZCL_' + name;
						$scope.miners[name] = {name : name, coin : 'ZCL'};
					}
					
					//$scope.miners[name].coin = 'ZCL';
					if ($scope.miners[name].coin == 'ZCL') {
						$scope.miners[name].hashrate = item.hashrateString.split(' ')[0];
						$scope.miners[name].rateunit = item.hashrateString.split(' ')[1];
						$scope.miners[name].shares   = item.shares;
						$scope.miners[name].time     = refresh_time;
						
//						var hist = data.history[key];
//						$scope.miners[name].lasttime = new Date(hist[hist.length-1].time * 1000);
//						if ($scope.miners[name].lasttime > $scope.miners[name].time) {
//							$scope.miners[name].time = $scope.miners[name].lasttime;
//						}
//						$scope.miners[name].desc     = jsDateDiff($scope.miners[name].time, $scope.miners[name].lasttime);
//						
//						if ($scope.miners[name].time - $scope.miners[name].lasttime > 300 * 1000) { //  || item.diff < 0
//							$scope.miners[name].state = 'off';
//						} else {
//							$scope.miners[name].state = 'on';
//						}
					}
				}
				$scope.after('ZCL');
			}
		});
	}
	
	$scope.refreshZEC = function(callback) {
		$scope.pools['ZEC'].refreshing = true;
		var refresh_time = new Date();
		getResource(zec_api, function(err, data){
			$scope.pools['ZEC'].refreshing = false;
			if (err) {
				console.error(err);
			} else {
				$scope.miners['jg999zec'].state = 'off';
				data.data.forEach(function(item) {
					if (!item.lastSeen || item.time - item.lastSeen < 15 * 60) {
						console.log(item);
						if (!$scope.miners[item.worker]) {
							item.worker = 'ZEC_' + item.worker;
							$scope.miners[item.worker] = {name : item.worker, coin : 'ZEC'};
						}
						
						if ($scope.miners[item.worker].state != 'on') {
							$scope.miners[item.worker].coin = 'ZEC';
						}
						if (['jg999zec'].indexOf(item.worker) >= 0) {
							$scope.miners[item.worker].state = 'on';
						}
						
						if ($scope.miners[item.worker].coin == 'ZEC') {
							$scope.miners[item.worker].rateunit = 'kH/s';
							$scope.miners[item.worker].hashrate = item.currentHashrate / 1024;
							$scope.miners[item.worker].avghash  = item.averageHashrate / 1024;
							$scope.miners[item.worker].shares   = item.validShares;
						}
						
					}
					
				});
				$scope.after('ZEC');
			}
		});
	}
	
	$scope.refresh = function(callback) {
		$scope.refreshZCL();
		$scope.refreshZEC();
		$scope.refreshPrice();
		$scope.refreshGpu();
	}
	
	$scope.price = {refreshing: false};
	$scope.refreshPrice = function() {
		$scope.price.refreshing = true;
		getResource(price_api, function(err, data) {
			$scope.price.refreshing = false;
			var coins_price = ['BTC', 'BCH', 'ETH', 'ZEC', 'ZCL', 'XRP', 'XLM', 'SC']
			if (data) {
				data.forEach(function(item){
					if (coins_price.indexOf(item.symbol) >=0) {
						$scope.price[item.symbol] = parseFloat(item.price_cny);
					}
				});
				console.log($scope.price);
			}
		});
	}
	
	$scope.gpu_refreshing = false;
	$scope.refreshGpu = function() {
		$scope.gpu_refreshing = true;
		getResource(gpu_api, function(err, data) {
			$scope.gpu_refreshing = false;
			if (data) {
				var server_time = new Date(data.server_time);
				for (var name in data) {
					if ($scope.miners[name]) {
						if (['JG999:3333', 'JG999:3334', '127.0.0.1:9999'].indexOf(data[name].value.server) >= 0) {
							$scope.miners[name].coin = 'ZEC';
						} else if (data[name].value.server == '127.0.0.1:8888'){
							$scope.miners[name].coin = 'ZCL';
						} else {
							$scope.miners[name].coin = data[name].value.server;
						}
						$scope.miners[name].gpu_num = data[name].value.gpu_num;
						$scope.miners[name].gpu_1063  = 0;
						$scope.miners[name].gpu_p106  = 0;
						$scope.miners[name].gpu_thigh = 0;
						$scope.miners[name].gpu_tlow  = 0;
						$scope.miners[name].gpu_fail  = 0;
						data[name].value.gpus.forEach(function(gpu) {
							if (gpu.name == 'GeForce GTX 1060 3GB') { 
								$scope.miners[name].gpu_1063++; 
							} else if (gpu.name == 'P106-100') {
								$scope.miners[name].gpu_p106++;
							} else {
								console.error(gpu.name);
							}
							if (gpu.speed_sps < 200) {
								$scope.miners[name].gpu_fail++;
							}
							
							if (gpu.temperature > $scope.miners[name].gpu_thigh) {
								$scope.miners[name].gpu_thigh = gpu.temperature;
							}
							if ($scope.miners[name].gpu_tlow == 0 || gpu.temperature < $scope.miners[name].gpu_tlow) {
								$scope.miners[name].gpu_tlow = gpu.temperature;
							}
						});
						$scope.miners[name].gpu_desc = '';
						if ($scope.miners[name].gpu_num !== $scope.miners[name].gpu_1063 + $scope.miners[name].gpu_p106) {
							$scope.miners[name].gpu_desc += ', ' + $scope.miners[name].gpu_num + 'GPUs';
						}
						$scope.miners[name].gpu_desc += $scope.miners[name].gpu_1063 ? ', ' + $scope.miners[name].gpu_1063 + ' * 1063' : '';
						$scope.miners[name].gpu_desc += $scope.miners[name].gpu_p106 ? ', ' + $scope.miners[name].gpu_p106 + ' * P106' : '';
						$scope.miners[name].gpu_desc = $scope.miners[name].gpu_desc.substring(2);
						
						$scope.miners[name].gpu_speed  = data[name].value.speed;
						$scope.miners[name].gpu_accept = data[name].value.accepted_shares;
						$scope.miners[name].gpu_reject = data[name].value.rejected_shares;
						$scope.miners[name].gpu_start  = data[name].value.start_time;
						$scope.miners[name].gpu_since  = data[name].value.since_start;
						var update_time = new Date(data[name].last_update);
						$scope.miners[name].gpu_update_desc =jsDateDiff(server_time, update_time);
						$scope.miners[name].gpu_timeout = server_time - update_time > 120000;
						
						$scope.miners[name].gpu_timeout ? $scope.miners[name].state = 'off' : $scope.miners[name].state = 'on';
					}
				}
			}
		});
	}
	
	
	function getResource(url, callback){
		console.log('GET: ' + url);
		$http({
			method: 'GET',
			url: url
		}).then(function(res) {
			if (res.status != "200") {
				callback(res, null);
			} else {
				callback(null, res.data);
			}
		}).catch(function(err) {
			callback(err, null);
		});
	}
});


function round(dight, howMany) {
	if(howMany) {
		dight = Math.round(dight * Math.pow(10, howMany)) / Math.pow(10, howMany);
	} else {
		dight = Math.round(dight);
	}	
	return dight;
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
