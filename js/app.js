var myApp = angular.module('myApp', []);

myApp.run(['$rootScope', function($rootScope) {
	console.log('init');
}]);

myApp.controller('MyController', function($scope, $interval, $http) {
	var zcl_api = "http://upool.foxcny.com/api/worker_stats?t1JxC6aaWzJ6jESwW4SCqVSWf8YyJvXqZ7Q";
	var zec_api = "https://api-zcash.flypool.org/miner/t1NajHvjBQtndnn1VEzY5r4xgYihZ8e5bE2/workers?miner=t1NajHvjBQtndnn1VEzY5r4xgYihZ8e5bE2";
	
	var price_api = "https://api.coinmarketcap.com/v1/ticker/?convert=CNY&limit=400";
	
	var workers = ['jg001', 'jg002', 'jg003'];
	for (var i=1; i<=20; i++) {
		var str = '0' + i;
		workers.push('jg1' + str.substring(str.length - 2));
	}
	for (var i=1; i<=30; i++) {
		var str = '0' + i;
		workers.push('jg2' + str.substring(str.length - 2));
	}
	
	$scope.miners = {};
	workers.forEach(function(name){
		$scope.miners[name] = {
			name     : name,
			coin     : null,
			hashrate : null,
			avghash  : null,
			rateunit : '',
			shares   : 0,
			time     : null,
			lasttime : null,
			desc     : null,
			state    : 'pending'
		}
	});
	
	$scope.pools = {
		ZCL : {alive: 0, hashrate: 0, refreshing: false},
		ZEC : {alive: 0, hashrate: 0, refreshing: false},
		ETH : {alive: 0, hashrate: 0, refreshing: false}
	}
	$scope.after = function(coin) {
		$scope.pools[coin].alive = 0;
		$scope.pools[coin].hashrate = 0;
		for(var name in $scope.miners) {
			var worker = $scope.miners[name];
			if (coin == 'ZCL' && worker.coin == coin && worker.state == 'on') {
				$scope.pools[coin].alive++;
				if (worker.rateunit == 'KSol/s') {
					$scope.pools[coin].hashrate = $scope.pools[coin].hashrate + parseFloat(worker.hashrate);
				} else {
					$scope.pools[coin].hashrate = $scope.pools[coin].hashrate + parseFloat(worker.hashrate)  / 1024;
				}
			}
			if (coin == 'ZEC' && worker.coin == coin && worker.state == 'on') {
				$scope.pools[coin].alive++;
				$scope.pools[coin].hashrate = $scope.pools[coin].hashrate + parseFloat(worker.hashrate);
			}
		}
	}
	$scope.before = function(coin) {
		var now = new Date();
		for(var name in $scope.miners) {
			var worker = $scope.miners[name];
			if (worker.coin == coin && worker.state != 'pending') {
				worker.state = 'off';
				worker.time  = now;
				worker.desc  = jsDateDiff(worker.time, worker.lastSeen);
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
				$scope.before('ZCL');
				for (var key in data.workers) {
					var item = data.workers[key];
					var name = key.split('.')[1];
					if (!$scope.miners[name]) {
						item.worker = 'ZCL_' + name;
						$scope.miners[name] = {name : name};
					}
					
					$scope.miners[name].coin = 'ZCL';
					$scope.miners[name].hashrate = item.hashrateString.split(' ')[0];
					$scope.miners[name].rateunit = item.hashrateString.split(' ')[1];
					$scope.miners[name].shares   = item.shares;
					$scope.miners[name].time     = refresh_time;
					
					var hist = data.history[key];
					$scope.miners[name].lasttime = new Date(hist[hist.length-1].time * 1000);
					if ($scope.miners[name].lasttime > $scope.miners[name].time) {
						$scope.miners[name].time = $scope.miners[name].lasttime;
					}
					$scope.miners[name].desc     = jsDateDiff($scope.miners[name].time, $scope.miners[name].lasttime);
					
					if (item.time - item.lastSeen > 15 * 60 || item.diff < 0) {
						$scope.miners[name].state = 'off';
					} else {
						$scope.miners[name].state = 'on';
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
				$scope.before('ZEC');
				data.data.forEach(function(item) {
					var overwrite = true;
					var now = new Date();
					if ($scope.miners[item.worker] 
							&& $scope.miners[item.worker].coin != 'ZEC'
							&& $scope.miners[item.worker].state == 'on') {
						overwrite = false;
					}
					
					if (overwrite) {
						if (!$scope.miners[item.worker]) {
							item.worker = 'ZEC_' + item.worker;
							$scope.miners[item.worker] = {name : item.worker};
						}
						
						$scope.miners[item.worker].coin = 'ZEC';
						$scope.miners[item.worker].rateunit = 'kH/s';
						$scope.miners[item.worker].hashrate = item.currentHashrate / 1024;
						$scope.miners[item.worker].avghash  = item.averageHashrate / 1024;
						$scope.miners[item.worker].shares   = item.validShares;
						$scope.miners[item.worker].time     = new Date(item.time * 1000);
						if (item.lastSeen) {
							$scope.miners[item.worker].lasttime = new Date(item.lastSeen * 1000);
						}
						$scope.miners[item.worker].desc     = jsDateDiff(item.time, item.lastSeen);
						
						if (item.time - item.lastSeen > 15 * 60) {
							$scope.miners[item.worker].state = 'off';
						} else {
							$scope.miners[item.worker].state = 'on';
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
	}
	
	$scope.price = {refreshing: false};
	$scope.refreshPrice = function() {
		$scope.price.refreshing = true;
		getResource(price_api, function(err, data) {
			$scope.price.refreshing = false;
			var coins_price = ['BTC', 'BCH', 'ETH', 'ZEC', 'ZCL', 'XRP', 'XLM']
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
    d = time_now - last_time;      
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
        var s = new Date(time_now*1000);      
        return (s.getMonth()+1)+"月"+s.getDate()+"日";      
    }      
}       
