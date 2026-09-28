import Tbjson from '../src/Tbjson';

import benchmarks from './benchmarks';
import cast from './cast';
import clone from './clone';
import definition from './definition';
import flattenValidation from './flattenValidation';
import inheritance from './inheritance';
import large from './large';
import nested from './nested';
import nestedDefinition from './nestedDefinition';
import noCodegen from './noCodegen';
import nulls from './nulls';
import nullable from './nullable';
import objectCodes from './objectCodes';
import plain from './plain.js';
import plainInTyped from './plainInTyped';
import prototype from './prototype';
import prototypeCast from './prototypeCast';
import range from './range';
import regex from './regex';
import reuse from './reuse';
import selection from './selection';
import selectionPaths from './selectionPaths';
import serialize from './serialize';
import stream from './stream';
import strings from './strings';
import typed from './typed.js';
import typedArray from './typedArray';
import typedSelection from './typedSelection';
import types from './types.js';
import typesCast from './typesCast.js';
import unbuild from './unbuild';
import validate from './validate';
import validateEdges from './validateEdges';
import variableDefs from './variableDefs';
import views from './views';

function stringify(val, cast = false) {
	return JSON.stringify(val, (name, val) => {

		if (cast) {
			if (typeof val == 'bigint') {
				val = Number(val);
			} else if (val instanceof Date || val instanceof RegExp) {
				val = val.toString();
			}
		}

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
	runTest('Clone', clone);
	runTest('Definition', definition);
	runTest('Inheritance', inheritance);
	runTest('Large', large);
	runTest('Nested', nested);
	runTest('Nested Definition', nestedDefinition);
	runTest('No Codegen', noCodegen);
	runTest('Nulls', nulls);
	runTest('Nullable', nullable);
	runTest('Object Codes', objectCodes);
	runTest('Plain', plain);
	runTest('Plain In Typed', plainInTyped);
	runTest('Prototype', prototype);
	runTest('prototypeCast', prototypeCast);
	runTest('Range', range);
	runTest('Regex', regex);
	runTest('Reuse', reuse);
	runTest('Selection', selection);
	runTest('Selection Paths', selectionPaths);
	runTest('Serialize', serialize);
	runTest('Stream', stream);
	runTest('Strings', strings);
	runTest('Typed', typed);
	runTest('Typed Array', typedArray);
	runTest('Typed Selection', typedSelection);
	runTest('Types', types);
	runTest('Types Cast', typesCast);
	runTest('Unbuild', unbuild);
	runTest('Validate', validate);
	runTest('Validate Edges', validateEdges);
	runTest('Validation Flattened', flattenValidation);
	runTest('Variable Definitions', variableDefs);
	runTest('Views', views);
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

// run benchmarks
if (process.argv.length > 2 && process.argv[2] == '--benchmarks') {
	benchmarks(Tbjson);
} else {
	run();
}