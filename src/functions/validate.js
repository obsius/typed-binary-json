import {
	NULL,
	BOOL,
	INT8,
	UINT8,
	INT16,
	UINT16,
	INT32,
	UINT32,
	FLOAT32,
	FLOAT64,
	STRING,
	ARRAY,
	OBJECT,
	NULLABLE,
	TYPED_ARRAY,
	INSTANCE
} from '../constants';

import getParent from '../utility/getParent';

/**
 * Check a prototype instance (or plain object with specified proto) for invalid fields using the TBJSON definition when available.
 * Return a nested object mirroring the source object with errors.
 * 
 * @param { object } obj - object to check
 * @param { function } prototype - prototype to to treat object as
 * @param { object } options - options
 */
export default function validate(obj, prototype = null, options = {}, definitions = {}, errorCount = 0) {

	let walkObj;
	let walkProto;

	// validate type
	if (typeof prototype == 'number') {

		if (!validTypedValue(obj, prototype, options)) {
			return [prototype, errorCount + 1];
		}

	// compound or recursive check
	} else {

		let isArray = Array.isArray(prototype);
		let isArrayTypeDef = Array.isArray(prototype) && prototype.length == 2;

		// array
		if (isArray && (Array.isArray(obj) || isTypedArray(obj))) {

			// typed array
			if (isArrayTypeDef && (prototype[0] == ARRAY || prototype[1] == TYPED_ARRAY)) {
				walkObj = obj;
				walkProto = prototype[1];
				
			// unknown array
			} else {
				walkObj = prototype;
			}

		// qualified type
		} else if (isArrayTypeDef) {

			switch (prototype[0]) {

				// uniform value object
				case OBJECT:

					// cannot be null
					if (typeof obj == 'object' && obj) {
						walkObj = obj;
						walkProto = prototype[1];

					// a null object must be marked nullable
					} else {
						errors = OBJECT;
						errorCount++;
					}

					break;

				// nullable object
				case NULLABLE:

					// ignore if null
					if (obj != null) {

						// ignore nullable nan
						if (!(
							options.allowNullableNaN &&
							typeof prototype[1] == 'number' &&
							prototype[1] >= UINT8 &&
							prototype[1] <= FLOAT64 &&
							Number.isNaN(obj)
						)) {
							return validate(obj, prototype[1], options, definitions, errorCount);
						}
					}

					break;

				// instance object
				case INSTANCE:
					return validate(obj, prototype[1], options, definitions, errorCount);
			}

		// object
		} else if (typeof obj =='object' && obj) {

			let definition;

			if (!prototype) {
				prototype = obj.constructor;
			}

			// prototype is tbjson with a definition
			if (typeof prototype == 'function' && prototype.tbjson) {

				// call the validate function for custom validation
				if (prototype.tbjson.validate) {
					return tbjson.validate(obj, options, errorCount);

				// use the passed prototype
				} else {

					// use map
					if (definitions[prototype.name]) {
						definition = definitions[prototype.name];

					// check for parent
					} else {

						definition = prototype.tbjson.definition;

						// only check for a parent if the definition is an object
						if (typeof definition == 'object') {

							for (let parent = prototype; parent = getParent(parent);) {
								if (!parent.tbjson || !parent.tbjson.definition) { break; }
								definition = Object.assign({}, parent.tbjson.definition, definition);
							}

							definitions[prototype.name] = definition;
						}
					}
				}

			// definition object
			} else if (typeof prototype == 'object' && prototype) {
				definition = prototype;

			// pseudo prototype
			} else if (typeof prototype == 'string') {
				definition = definitions[prototype];
			}

			if (definition) {
				walkObj = definition;
				prototype = definition;
			}
		}
	}

	// recurse into the object
	if (walkObj) {

		let errors = {};
		let inputErrorCount = errorCount;

		for (let key in walkObj) {

			let [subErrors, subErrorCount] = validate(obj[key], walkProto || prototype[key], options, definitions, errorCount);

			if (subErrorCount > errorCount) {
				errors[key] = subErrors;
				errorCount = subErrorCount;
			}

			if (options.returnOnNthError && errorCount >= options.returnOnNthError) {
				break;
			}
		}

		return [errorCount > inputErrorCount ? errors : null, errorCount];

	// no errors
	} else {
		return [null, 0];
	}
}

/* internal */

/**
 * Return true if the value passed is a typed array.
 * 
 * @param { * } val - val to check
 */
export function isTypedArray(val) {
	if (typeof val == 'object' && val) {
		return (
			val instanceof Uint8Array ||
			val instanceof Int8Array ||
			val instanceof Uint16Array ||
			val instanceof Int16Array ||
			val instanceof Uint32Array ||
			val instanceof Int32Array ||
			val instanceof Float32Array ||
			val instanceof Float64Array
		);
	} else {
		return false;
	}
}

/**
 * Check if a value conforms to a primitive type.
 * 
 * @param { * } val - value to check
 * @param { number } type - the tbjson primitive type
 * @param { object } options - options
 */
function validTypedValue(val, type, options = {}) {
	switch (type) {

		case NULL:
			return val == null;

		case BOOL:
			return typeof val == 'boolean' || val === 0 || val === 1;

		case INT8:
			return typeof val == 'number' && (Number.isNaN(val) ? !!options.allowNaN : val >= -128 && val <= 127);

		case UINT8:
			return typeof val == 'number' && (Number.isNaN(val) ? !!options.allowNaN : val >= 0 && val <= 255);

		case INT16:
			return typeof val == 'number' && (Number.isNaN(val) ? !!options.allowNaN : val >= -32768  && val <= 32767);

		case UINT16:
			return typeof val == 'number' && (Number.isNaN(val) ? !!options.allowNaN : val >= 0 && val <= 65535);

		case INT32:
			return typeof val == 'number' && (Number.isNaN(val) ? !!options.allowNaN : val >= -2147483648 && val < 2147483647);

		case UINT32:
			return typeof val == 'number' && (Number.isNaN(val) ? !!options.allowNaN : val >= 0 && val <= 4294967295);

		case FLOAT32:
		case FLOAT64:
			return typeof val == 'number' && (!!options.allowNaN || !Number.isNaN(val));

		case STRING:
			return typeof val == 'string' || (!!options.allowNullString && val == null);

		case ARRAY:
			return Array.isArray(val);

		case OBJECT:
			return typeof val == 'object' && val != null;
	}

	return true;
}