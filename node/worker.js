var child_process = require('child_process');
var fs = require("fs");  
var MonitorUtil = require('./MonitorUtil.js').MonitorUtil;
var State = require('./State.js').State;

var log4js     = require('log4js');
log4js.configure({
  appenders: { console: { type: 'console' } },
  categories: { default: { appenders: [ 'console' ], level: 'debug' } },
});

var logger = log4js.getLogger('console');
console.log = logger.info.bind(logger);
console.warn = logger.warn.bind(logger);
console.error = logger.error.bind(logger);

var mutil = new MonitorUtil();

process.on('exit', function () {
    if (task.thread) {
    	logger.warn('EXIT KILL child_process!');
    	task.thread.kill();
    }
});

var task = {
	exe     : 'miner.exe',
	start   : undefined,
	thread  : undefined,
	reset_c : 0
};

var myArgs = process.argv.slice(2);
if (myArgs[0] == 'zec') {
	task.start  = __dirname + '\\zec.bat';
	task.reset_c = 6;
} else {
	task.start  = __dirname + '\\zcl.bat';
	task.reset_c = 4;
}

var workername = getWorkerName();
logger.warn('Worker Name: ' + workername);
var state = new State(workername);

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
	run(task.start, [], (output) =>{
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

var shares_nochange_count = 0;
function check(callback) {
	var last_rejected = state.rejected_shares;
	var last_shares = state.accepted_shares;
	state.refresh((err) => {
		if (err) {
			return callback(err);
		}
		
		if (new Date() - state.update_time > 120 * 1000) {
			logger.warn('No change for 120s');
			return callback('timeout');
		}
		
		if (state.rejected_shares > 10 || state.rejected_shares - last_rejected > 2) {
			logger.warn('Too much rejected');
			return callback('reject too much');
		}
		
		if (state.accepted_shares == last_shares) {
			shares_nochange_count++;
			logger.warn('shares_nochange_count: ' + shares_nochange_count);
			if (shares_nochange_count > task.reset_c) {
				shares_nochange_count = 0;
				return callback('no output');
			}
		} else {
			shares_nochange_count = 0;
		}
		
		return callback(null);
	});
}

function ticker() {
	check((err) => {
		if (err) {
			beginMining(()=>{
				setTimeout(function(){ ticker(); }, 10 * 1000);	
			});
		} else {
			state.report();
			mutil.post(state.name, state);
			setTimeout(function(){ ticker(); }, 30 * 1000);	
		}
	});
}

ticker();

function getWorkerName() {
	var batfile = fs.readFileSync(task.start,"utf-8").split(' ')[1];
	var realfile = fs.readFileSync(batfile,"utf-8");
	var params = realfile.split(' ');
	var name = 'jg000';
	for (var i=0; i<params.length; i++) {
		if (params[i].indexOf('-u') >= 0) {
			name = params[i+1];
			break;
		}
	}
	var index = name.indexOf('.');
	if (index >= 0) {
		name = name.substring(index + 1);
	}
	return name;
}
