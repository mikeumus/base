// 2016 January 20
// https://github.com/bevry/base
/* eslint no-console:0, prefer-reflect:0, no-magic-numbers:0, no-sync:0, object-shorthand:0 */
'use strict'


// =====================================
// Imports

const fsUtil = require('fs')
const pathUtil = require('path')


// =====================================
// Variables

// Define environment things
const WINDOWS          = process.platform.indexOf('win') === 0
const NODE             = process.execPath
const NPM              = WINDOWS ? process.execPath.replace('node.exe', 'npm.cmd') : 'npm'
// const EXT              = WINDOWS ? '.cmd' : ''
const GIT              = 'git'

// Define project paths
const APP_PATH         = process.cwd()
const PACKAGE_PATH     = pathUtil.join(APP_PATH, 'package.json')
const PACKAGE_DATA     = require(PACKAGE_PATH)
const PACKAGE_CONFIG   = PACKAGE_DATA.nakeConfiguration || PACKAGE_DATA.cakeConfiguration || {}

// Define module paths
const MODULES_PATH     = pathUtil.join(APP_PATH, 'node_modules')
const DOCPAD_PATH      = pathUtil.join(MODULES_PATH, 'docpad')

// Define configuration
const config = {
	// Define executable paths
	COFFEE_BIN_PATH: pathUtil.join(MODULES_PATH, '.bin', 'coffee'),
	PROJECTZ_BIN_PATH: pathUtil.join(MODULES_PATH, '.bin', 'projectz'),
	DOCCO_BIN_PATH: pathUtil.join(MODULES_PATH, '.bin', 'docco'),
	DOCPAD_BIN_PATH: pathUtil.join(MODULES_PATH, '.bin', 'docpad'),
	BISCOTTO_BIN_PATH: pathUtil.join(MODULES_PATH, '.bin', 'biscotto'),
	YUIDOC_BIN_PATH: pathUtil.join(MODULES_PATH, '.bin', 'yuidoc'),
	BABEL_BIN_PATH: pathUtil.join(MODULES_PATH, '.bin', 'babel'),
	ESLINT_BIN_PATH: pathUtil.join(MODULES_PATH, '.bin', 'eslint'),
	COFFEELINT_BIN_PATH: pathUtil.join(MODULES_PATH, '.bin', 'coffeelint'),

	// Define project paths
	TEST_PATH: 'test',
	DOCCO_SRC_PATH: null,
	DOCCO_OUT_PATH: 'docs',
	BISCOTTO_SRC_PATH: null,
	BISCOTTO_OUT_PATH: 'docs',
	YUIDOC_SRC_PATH: null,
	YUIDOC_OUT_PATH: 'docs',
	YUIDOC_SYNTAX: 'js',
	COFFEE_SRC_PATH: null,
	COFFEE_OUT_PATH: 'out',
	DOCPAD_SRC_PATH: null,
	DOCPAD_OUT_PATH: 'out',
	BABEL_SRC_PATH: null,
	BABEL_OUT_PATH: 'es5',
	ESLINT_SRC_PATH: null,
	COFFEELINT_SRC_PATH: null
}

// Move package.json:nakeConfiguration into our configuration object
Object.keys(PACKAGE_CONFIG).forEach(function (key) {
	const value = PACKAGE_CONFIG[key]
	config[key] = value
})


// =====================================
// Generic

const childProcess = require('child_process')

function spawn (command, args, opts, next) {
	const commandString = command + ' ' + args.join(' ')
	if ( opts.output === true ) {
		console.log(commandString)
		opts.stdio = 'inherit'
	}
	const pid = childProcess.spawn(command, args, opts)
	pid.on('close', function () {
		const args = Array.prototype.slice.call(arguments)
		if ( args[0] === 1 ) {
			const error = new Error('Process [' + commandString + '] exited with error status code.')
			next(error)
		}
		else {
			next()
		}
	})
	return pid
}

function exec (command, opts, next) {
	if ( opts.output === true ) {
		console.log(command)
		return childProcess.exec(command, opts, function (error, stdout, stderr) {
			console.log(stdout)
			console.log(stderr)
			if ( next )  next(error)
		})
	}
	else {
		return childProcess.exec(command, opts, next)
	}
}

function steps (next, steps) {
	let step = 0

	function complete (error) {
		// success status code
		if ( error === 0 ) {
			error = null
		}

		// error status code
		else if ( error === 1 ) {
			error = new Error('Process exited with error status code')
		}

		// Error
		if ( error ) {
			next(error)
		}
		else {
			++step
			if ( step === steps.length ) {
				next()
			}
			else {
				steps[step](complete)
			}
		}
	}

	return steps[step](complete)
}


// =====================================
// Actions

const actions = {
	clean: function (opts, next) {
		// Steps
		steps(next, [
			function (complete) {
				console.log('\nclean:')

				// Prepare rm args
				const args = ['-Rf']

				// Add compilation paths to args
				Object.keys(config).forEach(function (key) {
					const value = config[key]
					if ( key.indexOf('OUT_PATH') !== -1 ) {
						args.push(value)
					}
				})

				// Add common ignore paths to args
				; [APP_PATH, config.TEST_PATH].forEach(function (path) {
					args.push(
						pathUtil.join(path,  'build'),
						pathUtil.join(path,  'components'),
						pathUtil.join(path,  'bower_components'),
						pathUtil.join(path,  'node_modules'),
						pathUtil.join(path,  '*out'),
						pathUtil.join(path,  '*log'),
						pathUtil.join(path,  '*heapsnaphot'),
						pathUtil.join(path,  '*cpuprofile')
					)
				})

				// rm
				spawn('rm', args, {output: true, cwd: APP_PATH}, complete)
			}
		])
	},

	setup: function (opts, next) {
		// Steps
		steps(next, [
			function (complete) {
				console.log('\nnpm install (for app):')
				spawn(NPM, ['install'], {output: true, cwd: APP_PATH}, complete)
			},

			function (complete) {
				if ( !config.TEST_PATH || !fsUtil.existsSync(config.TEST_PATH) )  return complete()
				console.log('\nnpm install (for test):')
				spawn(NPM, ['install'], {output: true, cwd: config.TEST_PATH}, complete)
			},

			function (complete) {
				if ( !fsUtil.existsSync(DOCPAD_PATH) )  return complete()
				console.log('\nnpm install (for docpad tests):')
				spawn(NPM, ['install'], {output: true, cwd: DOCPAD_PATH}, complete)
			}
		])
	},

	compile: function (opts, next) {
		// Steps
		steps(next, [
			function (complete) {
				if ( !config.COFFEE_SRC_PATH || !fsUtil.existsSync(config.COFFEE_BIN_PATH) )  return complete()
				console.log('\ncoffee compile:')
				spawn(NODE, [config.COFFEE_BIN_PATH, '-co', config.COFFEE_OUT_PATH, config.COFFEE_SRC_PATH], {output: true, cwd: APP_PATH}, complete)
			},

			function (complete) {
				if ( !config.BABEL_SRC_PATH || !fsUtil.existsSync(config.BABEL_BIN_PATH) )  return complete()
				console.log('\nbabel compile:')
				spawn(NODE, [config.BABEL_BIN_PATH, config.BABEL_SRC_PATH, '--out-dir', config.BABEL_OUT_PATH], {output: true, cwd: APP_PATH}, complete)
			},

			function (complete) {
				if ( !config.DOCPAD_SRC_PATH || !fsUtil.existsSync(config.DOCPAD_BIN_PATH) )  return complete()
				console.log('\ndocpad generate:')
				spawn(NODE, [config.DOCPAD_BIN_PATH, 'generate'], {output: true, cwd: APP_PATH}, complete)
			}
		])
	},

	watch: function (opts, next) {
		// Steps
		steps(next, [
			function (complete) {
				if ( !config.BABEL_SRC_PATH || !fsUtil.existsSync(config.BABEL_BIN_PATH) )  return complete()
				console.log('\nbabel compile:')
				spawn(NODE, [config.BABEL_BIN_PATH, '-w', config.BABEL_SRC_PATH, '--out-dir', config.BABEL_OUT_PATH], {output: true, cwd: APP_PATH}, complete)
			},

			function (complete) {
				if ( !config.COFFEE_SRC_PATH || !fsUtil.existsSync(config.COFFEE_BIN_PATH) )  return complete()
				console.log('\ncoffee watch:')
				spawn(NODE, [config.COFFEE_BIN_PATH, '-wco', config.COFFEE_OUT_PATH, config.COFFEE_SRC_PATH], {output: true, cwd: APP_PATH})  // background
				complete()  // continue while coffee runs in background
			},

			function (complete) {
				if ( !config.DOCPAD_SRC_PATH || !fsUtil.existsSync(config.DOCPAD_BIN_PATH) )  return complete()
				console.log('\ndocpad run:')
				spawn(NODE, [config.DOCPAD_BIN_PATH, 'run'], {output: true, cwd: APP_PATH})  // background
				complete()  // continue while docpad runs in background
			}
		])
	},

	verify: function (opts, next) {
		// Steps
		steps(next, [
			function (complete) {
				console.log('\nnake compile')
				actions.compile(opts, complete)
			},

			function (complete) {
				console.log('\ncoffeelint:')
				if ( !config.COFFEELINT_SRC_PATH || !fsUtil.existsSync(config.COFFEELINT_BIN_PATH) )  return complete()
				spawn(config.COFFEELINT_BIN_PATH, [config.COFFEELINT_SRC_PATH], {output: true, cwd: APP_PATH}, complete)
			},

			function (complete) {
				console.log('\neslint:')
				if ( !config.ESLINT_SRC_PATH || !fsUtil.existsSync(config.ESLINT_BIN_PATH) )  return complete()
				spawn(config.ESLINT_BIN_PATH, [config.ESLINT_SRC_PATH], {output: true, cwd: APP_PATH}, complete)
			},

			function (complete) {
				console.log('\nnpm test:')
				spawn(NPM, ['test'], {output: true, cwd: APP_PATH}, complete)
			}
		])
	},

	meta: function (opts, next) {
		// Steps
		steps(next, [
			function (complete) {
				if ( !config.DOCCO_SRC_PATH || !fsUtil.existsSync(config.DOCCO_BIN_PATH) )  return complete()
				console.log('\ndocco compile:')
				const command = [NODE, config.DOCCO_BIN_PATH,
					'-o', config.DOCCO_OUT_PATH,
					config.DOCCO_SRC_PATH
				].join(' ')
				exec(command, {output: true, cwd: APP_PATH}, complete)
			},

			function (complete) {
				if ( !config.BISCOTTO_SRC_PATH || !fsUtil.existsSync(config.BISCOTTO_BIN_PATH) )  return complete()
				console.log('\nbiscotto compile:')
				const command = [config.BISCOTTO_BIN_PATH,
					'-n', PACKAGE_DATA.title || PACKAGE_DATA.name,
					'--title', '"' + (PACKAGE_DATA.title || PACKAGE_DATA.name) + ' API Documentation"',
					'-r', 'README.md',
					'-o', config.BISCOTTO_OUT_PATH,
					config.BISCOTTO_SRC_PATH,
					'-', 'LICENSE.md HISTORY.md'
				].join(' ')
				exec(command, {output: true, cwd: APP_PATH}, complete)
			},

			function (complete) {
				if ( !fsUtil.existsSync(config.YUIDOC_BIN_PATH) )  return complete()
				console.log('\nyuidoc compile:')
				const command = [config.YUIDOC_BIN_PATH]
				if ( config.YUIDOC_OUT_PATH )  command.push('-o', config.YUIDOC_OUT_PATH)
				if ( config.YUIDOC_SYNTAX )    command.push('--syntaxtype', config.YUIDOC_SYNTAX, '-e', '.' + config.YUIDOC_SYNTAX)
				if ( config.YUIDOC_SRC_PATH )  command.push(config.YUIDOC_SRC_PATH)
				spawn(NODE, command, {output: true, cwd: APP_PATH}, complete)
			},

			function (complete) {
				if ( !fsUtil.existsSync(config.PROJECTZ_BIN_PATH) )  return complete()
				console.log('\nprojectz compile')
				spawn(NODE, [config.PROJECTZ_BIN_PATH, 'compile'], {output: true, cwd: APP_PATH}, complete)
			}
		])
	},

	prerelease: function (opts, next) {
		// Steps
		steps(next, [
			function (complete) {
				console.log('\nnake verify')
				actions.verify(opts, complete)
			},

			function (complete) {
				console.log('\nnake meta')
				actions.meta(opts, complete)
			}
		])
	},

	release: function (opts, next) {
		// Steps
		steps(next, [
			function (complete) {
				console.log('\nnake prerelease')
				actions.prerelease(opts, complete)
			},

			function (complete) {
				console.log('\nnpm publish:')
				spawn(NPM, ['publish'], {output: true, cwd: APP_PATH}, complete)
				// ^ npm will run prepublish and postpublish for us
			},

			function (complete) {
				console.log('\nnake postrelease')
				actions.postrelease(opts, complete)
			}
		])
	},

	postrelease: function (opts, next) {
		// Steps
		steps(next, [
			function (complete) {
				console.log('\ngit tag:')
				spawn(GIT, ['tag', 'v' + PACKAGE_DATA.version, '-a'], {output: true, cwd: APP_PATH}, complete)
			},

			function (complete) {
				console.log('\ngit push origin master:')
				spawn(GIT, ['push', 'origin', 'master'], {output: true, cwd: APP_PATH}, complete)
			},

			function (complete) {
				console.log('\ngit push tags:')
				spawn(GIT, ['push', 'origin', '--tags'], {output: true, cwd: APP_PATH}, complete)
			}
		])
	}

}

// =====================================
// Commands

const commands = {
	clean: 'clean up instance',
	setup: 'setup our project for development',
	compile: 'compile our files',
	watch: 'compile our files initially, and again for each change',
	verify: 'verify our project works (includes compile)',
	meta: 'compile our meta files',
	prerelease: 'prepare our project for publishing (includes verify and meta)',
	release: 'publish our project using npm (includes prerelease and postrelease)',
	postrelease: 'prepare our project after publishing'
}

const aliases = {
	install: 'setup',
	test: 'verify',
	docs: 'meta',
	prepare: 'prerelease',
	prepublish: 'prerelease',
	publish: 'release',
	postpublish: 'postpublish'
}

const combined = {}

Object.keys(commands).forEach(function (command) {
	const description = commands[command]
	const method = actions[command]
	combined[command] = {
		description: description,
		method: method
	}
})

Object.keys(aliases).forEach(function (alias) {
	const command = aliases[alias]
	const description = 'alias for ' + command
	const method = actions[command]
	combined[alias] = {
		description: description,
		method: method
	}
})

// =====================================
// Command Line Interface

let desiredAction = null
let longestNameLength = 0

function finish (error) {
	if ( error ) {
		process.stderr.write( (error.stack || error.message || error) + '\n' )
		throw error
	}
	else {
		process.stdout.write('OK\n')
	}
}

function output (list) {
	let result = ''
	Object.keys(list).forEach(function (key) {
		const description = combined[key].description
		let name = key + ': '
		while ( name.length < longestNameLength + 10 )  name += ' '
		result += name + ' ' + description + '\n'
	})
	return result
}

Object.keys(combined).forEach(function (command) {
	if ( command.length > longestNameLength ) {
		longestNameLength = command.length
	}

	if ( process.argv.indexOf(command) !== -1 ) {
		desiredAction = command
	}
})

// Fire the method
if ( desiredAction ) {
	combined[desiredAction].method({}, finish)
}

// Display the help
else {
	console.log([
		'Nakefile help for ' + PACKAGE_DATA.name,
		'',
		'USAGE',
		'',
		'Standard usage:',
		'node --harmony nakefile.js $action',
		'',
		'NPM script usage:',
		'npm run-script $action',
		'',
		'Shell alias usage:',
		'nake $action',
		'',
		'ACTIONS',
		'',
		output(commands),
		output(aliases).trim()
	].join('\n'))
}
