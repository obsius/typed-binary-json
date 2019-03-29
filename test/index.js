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
}

function runTest(name, fn) {
	try {
	
		console.log(`Running ${name}...`); 

		let results = fn(Tbjson, stringify);

		if (results[0] != results[1]) {
			console.log('Failed');
			console.log(results);
		} else {
			console.log('Passed');
		}
	} catch (e) {
		console.log('Error running test: ', e);
	}
}

run();