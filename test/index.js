import Tbjson from '../src/Tbjson';

import plain from './plain.js';
import typed from './typed.js';
import prototype from './prototype';
import inheritance from './inheritance';
import nullable from './nullable';
import typedArray from './typedArray';
import plainInTyped from './plainInTyped';
import selection from './selection';
import typedSelection from './typedSelection';
import strings from './strings';

function stringify(val) {
	return JSON.stringify(val, (name, val) => {
		if (typeof val == 'number') {
			return +val.toFixed(3);
		}

		return val;
	});
}

function run() {
	runTest('Plain', plain);
	runTest('Typed', typed);
	runTest('Prototype', prototype);
	runTest('Inheritance', inheritance);
	runTest('Nullable', nullable);
	runTest('Typed Array', typedArray);
	runTest('Plain In Typed', plainInTyped);
	runTest('Selection', selection);
	runTest('Typed Selection', typedSelection);
	runTest('Strings', strings);
}

function runTest(name, fn) {
	try {
	
		console.log(`Running ${name}...`); 
		
		let startTime = (new Date()).getTime();

		let results = fn(Tbjson, stringify);

		let time = (new Date()).getTime() - startTime;

		if (results[0] != results[1]) {
			console.log(`Failed [${time} ms]`);
			console.log(results);
		} else {
			console.log(`Passed [${time} ms]`);
		}
	} catch (e) {
		console.log('Error running test: ', e);
	}
}

run();