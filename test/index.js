import Tbjson from '../src/Tbjson';

import cast from './cast';
import plain from './plain.js';
import typed from './typed.js';
import prototype from './prototype';
import inheritance from './inheritance';
import nested from './nested';
import nulls from './nulls';
import nullable from './nullable';
import plainInTyped from './plainInTyped';
import selection from './selection';
import typedArray from './typedArray';
import typedSelection from './typedSelection';
import strings from './strings';
import variableDefs from './variableDefs';

function stringify(val) {
	return JSON.stringify(val, (name, val) => {
		if (typeof val == 'number') {
			return +val.toFixed(3);
		}

		return val;
	});
}

function validateTypes(obj1, obj2, path = '$') {
	if (obj1 && typeof obj1 == 'object') {

		if (!obj2 || typeof obj2 != 'object' || obj1.constructor != obj2.constructor) {
			return path;
		}

		if (Array.isArray(obj1)) {

			if (!Array.isArray(obj2)) {
				return path;
			}

			for (let i = 0; i < obj1.length; ++i) {
				let invalid = validateTypes(obj1[i], obj2[i], `${path}[${i}]`);
				if (invalid) { return invalid; }
			}
		} else {
			for (let key in obj1) {
				let invalid = validateTypes(obj1[key], obj2[key], `${path}.${key}`);
				if (invalid) { return invalid; }
			}
		}
	}
}

function run() {
	runTest('Cast', cast);
	runTest('Plain', plain);
	runTest('Typed', typed);
	runTest('Prototype', prototype);
	runTest('Inheritance', inheritance);
	runTest('Nested', nested);
	runTest('Nulls', nulls);
	runTest('Nullable', nullable);
	runTest('Plain In Typed', plainInTyped);
	runTest('Selection', selection);
	runTest('Typed Array', typedArray);
	runTest('Typed Selection', typedSelection);
	runTest('Strings', strings);
	runTest('Variable Definitions', variableDefs);
}

function runTest(name, fn) {
	try {
	
		console.log(`Running ${name}...`); 
		
		let startTime = (new Date()).getTime();

		let results = fn(Tbjson, stringify, validateTypes);

		let time = (new Date()).getTime() - startTime;

		let success = false;
		let msg;

		if (Array.isArray(results)) {
			success = results[0] == results[1];
		} else if (typeof results == 'string') {
			success = false;
			msg = results;
		} else {
			success = results;
		}

		if (success) {
			console.log(`Passed [${time} ms]`);
		} else {
			console.log(`Failed [${time} ms]`);
			console.log(msg ? msg : results);
		}
	} catch (e) {
		console.log('Error running test: ', e);
	}
}

run();