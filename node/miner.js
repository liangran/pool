var child_process = require('child_process');
var filepath = require('./config.js').filepath;

var log4js     = require('log4js');
log4js.configure({
  appenders: { console: { type: 'console' } },
  categories: { default: { appenders: [ 'console' ], level: 'debug' } },
});
var logger = log4js.getLogger('console');

var task = {
	main   : undefined,
	backup : undefined,
	thread : undefined,
	state  : 'off',
	type   : 'main',
	start_time  : null,
	update_time : null,
	reset_num   : 0,
	check_num   : 0
};

process.on('exit', function () {
    if (task.thread) {
    	loggr.warn('EXIT KILL child_process!');
    	task.thread.kill();
    }
});


var myArgs = process.argv.slice(2);
if (myArgs[0] == 'zec') {
	task.main   = filepath['zec'];
	task.backup = filepath['zcl'];
} else {
	task.main   = filepath['zcl'];
	task.backup = filepath['zec'];
}

function run(type) {
	logger.warn('Spawn', type, task[type]);
	task.thread = child_process.spawn(task[type]);

	task.thread.stdout.on('data', (data) => {
		logger.info(data.toString());
		task.update_time = new Date();
	});

	task.thread.stderr.on('data', (data) => {
		logger.error(data.toString());
		task.update_time = new Date();
	});

	task.thread.on('exit', (code) => {
		logger.warn(`Child exited with code ${code}`);
		task.state = 'off';
	});

	var now = new Date();
	task.start_time = now;
	task.update_time = now;
	task.state = 'on';
	task.reset_num++;
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
	check();
	
	logger.warn('Run for %s seconds', (now - task.update_time)/1000);
	logger.warn(get_time_difference(now, task.start_time));
	logger.warn('State:', task.state, 'Run num:', task.reset_num);
	
	setTimeout(function(){ ticker(); }, 10 * 1000);	
}

ticker();


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