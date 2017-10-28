var child_process = require('child_process');
var request       = require("request");

var log4js     = require('log4js');
log4js.configure({
  appenders: { console: { type: 'console' } },
  categories: { default: { appenders: [ 'console' ], level: 'debug' } },
});
var logger = log4js.getLogger('console');

var task = {
	exe     : 'miner.exe',
	path    : 'C:/Zec/0.3.4b',
	start   : undefined,
	thread  : undefined,
	api     : 'http://127.0.0.1:42000/getstat',
	start_time  : null,
	update_time : null,
	check_num   : 0
};

process.on('exit', function () {
    if (task.thread) {
    	logger.warn('EXIT KILL child_process!');
    	task.thread.kill();
    }
});

var myArgs = process.argv.slice(2);
if (myArgs[0] == 'zec') {
	task.start  = task.path + '/zec.bat';
} else {
	task.start  = task.path + '/zcl.bat';
}

function run(command, params, callback) {
	logger.warn('Spawn', command, params.join(' '));
	task.thread = child_process.spawn(command, params);

	output = "";
	task.thread.stdout.on('data', (data) => {
		logger.info(data.toString());
		output += data.toString();
	});

	task.thread.stderr.on('data', (data) => {
		logger.error(data.toString());
	});

	task.thread.on('exit', (code) => {
		logger.warn(`Child exited with code ${code}`);
		task.thread = undefined;
		callback(output);
	});
}

function isProcessRunning(callback) {
	run('tasklist.exe', ['/FI', 'IMAGENAME eq ' + task.exe], (output) =>{
		return callback(output.indexOf('PID') > 0);
	});
}

function killProcess(callback) {
	run('taskkill.exe', ['/F', '/IM', task.exe], (output) =>{
		return callback();
	});
}

function startProcess(callback) {
	run('cmd.exe', ['/c', 'START ' + task.start], (output) =>{
		return callback();
	});
}

function beginMining(callback) {
	isProcessRunning((running) => {
		if (running) {
			logger.warn('Kill and start mining.');
			killProcess(() => {
				startProcess(callback);
			});
		} else {
			logger.warn('Start mining.')
			startProcess(callback);
		}
	});
}

function getstat(callback) {
	request(task.api, function(error, response, body) {
		if (!error) {
			console.log(response.statusCode, body)
			//var data = JSON.parse(body));
			var result = {"method":"getstat", "error":null, "start_time":1509161274, "current_server":"JG999:6666", "available_servers":1, "server_status":2, "result":[{"gpuid":0, "cudaid":0, "busid":"0000:03:00.0", "name":"GeForce GTX 1060 3GB", "gpu_status":2, "solver":0, "temperature":77, "gpu_power_usage":108, "speed_sps":268, "accepted_shares":0, "rejected_shares":0, "start_time":1509161275},{"gpuid":1, "cudaid":1, "busid":"0000:04:00.0", "name":"GeForce GTX 1060 3GB", "gpu_status":2, "solver":0, "temperature":71, "gpu_power_usage":109, "speed_sps":272, "accepted_shares":0, "rejected_shares":0, "start_time":1509161275},{"gpuid":2, "cudaid":2, "busid":"0000:05:00.0", "name":"GeForce GTX 1060 3GB", "gpu_status":2, "solver":0, "temperature":76, "gpu_power_usage":104, "speed_sps":265, "accepted_shares":0, "rejected_shares":0, "start_time":1509161275}]};
			callback(null, result);
		} else {
			logger.warn(body);
			logger.error(error.code ? error.code : error);
			callback(error || response.statusCode, null);
		}
	});
}

function check() {
	if (task.state == 'off' || task.state == 'stop') {
		logger.warn('State is', task.state, 'START MINING!');
		if (task.thread) {
			logger.warn('Kill the existing one.');
			task.thread.kill();
		}
		
		var type = task.reset_num < 10 ? 'main' : 'backup';
		run(type);
	}
}

function ticker() {
	var now = new Date();
	if ((now - task.update_time)/1000 > 60 && task.state != 'off') {
		logger.warn('No update for %s seconds.', (now - task.update_time)/1000)
		task.state = 'stop';
	}
	
	logger.warn('Run for %s seconds', (now - task.update_time)/1000);
	logger.warn(get_time_difference(now, task.start_time));
	logger.warn('State:', task.state, 'Run num:', task.reset_num);
	
	setTimeout(function(){ ticker(); }, 10 * 1000);	
}

//ticker();
beginMining(()=>{
	console.log('DONE');
});
//run(__dirname + '\\killzcl.bat');

//getstat((err, data) => {
//	if (err) {
//		logger.error('fail');
//	} else {
//		logger.warn(data);
//	}
//});

function get_time_difference(laterDate, earlierDate) 
{
    var oDiff = new Object();

    //  Calculate Differences
    //  -------------------------------------------------------------------  //
    var nTotalDiff = laterDate.getTime() - earlierDate.getTime();

    oDiff.days = Math.floor(nTotalDiff / 1000 / 60 / 60 / 24);
    nTotalDiff -= oDiff.days * 1000 * 60 * 60 * 24;

    oDiff.hours = Math.floor(nTotalDiff / 1000 / 60 / 60);
    nTotalDiff -= oDiff.hours * 1000 * 60 * 60;

    oDiff.minutes = Math.floor(nTotalDiff / 1000 / 60);
    nTotalDiff -= oDiff.minutes * 1000 * 60;

    oDiff.seconds = Math.floor(nTotalDiff / 1000);
    //  -------------------------------------------------------------------  //
    //  Format Duration
    //  -------------------------------------------------------------------  //
    //  Format Hours
    var hourtext = '00';
    if (oDiff.days > 0){ hourtext = String(oDiff.days);}
    if (hourtext.length == 1){hourtext = '0' + hourtext};

    //  Format Minutes
    var mintext = '00';
    if (oDiff.minutes > 0){ mintext = String(oDiff.minutes);}
    if (mintext.length == 1) { mintext = '0' + mintext };

    //  Format Seconds
    var sectext = '00';
    if (oDiff.seconds > 0) { sectext = String(oDiff.seconds); }
    if (sectext.length == 1) { sectext = '0' + sectext };

    //  Set Duration
    var sDuration = hourtext + ':' + mintext + ':' + sectext;
    oDiff.duration = sDuration;
    //  -------------------------------------------------------------------  //

    return oDiff;
}