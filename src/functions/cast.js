import {
	BOOL,
	STRING,
	ARRAY,
	OBJECT,
	NULLABLE,
	VARIABLE_DEF,
	INSTANCE
} from '../constants';

import getParent from '../utility/getParent';

/**
 * Cast a plain object into the typed object it represents. Only supports prototype definitions, not strings.
 * 
 * @param { object } obj - object to parse
 * @param { function } prototype - prototype to cast into
 * @param { array } types - array of types with deserializers
 * @param { bool } castPrimitives - also cast primitives (bool, number, string)
 * @param { bool } freeMemory - set obj properties to undefined as the obj is cast (slower, but frees up memory)
 */
export default function cast(obj, prototype, types, castPrimitives = false, freeMemory = false, definitions = {}) {

	// plain object or array with a definition (ignore prototyped)
	if (prototype && (typeof prototype == 'function' || typeof prototype == 'object')) {

		let isNonNullObject = typeof obj == 'object' && obj;

		let isArray = Array.isArray(prototype);
		let isArrayTypeDef = Array.isArray(prototype) && prototype.length == 2;

		// array
		if (Array.isArray(obj) && isArray) {

			let typedObj;

			// typed array
			if (isArrayTypeDef && prototype[0] == ARRAY) {

				typedObj = new Array(obj.length);

				for (let i = 0; i < obj.length; ++i) {
					typedObj[i] = cast(obj[i], prototype[1], types, castPrimitives, freeMemory, definitions);
					if (freeMemory) { obj[i] = undefined; }
				}
				
			// unknown array
			} else {

				typedObj = new Array(prototype.length);

				for (let i = 0; i < prototype.length; ++i) {
					typedObj[i] = cast(obj[i], prototype[i], types, castPrimitives, freeMemory, definitions);
					if (freeMemory) { obj[i] = undefined; }
				}
			}

			return typedObj;

		// qualified type
		} else if (isArrayTypeDef) {
		
			switch (prototype[0]) {

				// uniform value object
				case OBJECT:

					let typedObj = {};

					if (isNonNullObject) {
						for (let key in obj) {
							typedObj[key] = cast(obj[key], prototype[1], types, castPrimitives, freeMemory, definitions);
							if (freeMemory) { obj[key] = undefined; }
						}
					}

					return typedObj;

				// nullable object
				case NULLABLE:
					return obj == null ? null : cast(obj, prototype[1], types, castPrimitives, freeMemory, definitions);
			
				// variable def, won't know this when casting
				case VARIABLE_DEF:
					return obj;

				// instance object
				case INSTANCE:
					return cast(obj, prototype[1], types, castPrimitives, freeMemory, definitions);
			}

		// non-prototyped object
		} else if (!obj || !obj.constructor || obj.constructor.prototype == Object.prototype) {

			let tbjson = prototype.tbjson;

			// prototype is tbjson with a definition
			if (tbjson && tbjson.definition) {

				let typedObj;
				let definition;

				// call the cast function to instantiate the correct prototype
				if (tbjson.cast) {
					return cast(obj, tbjson.cast(obj), types, castPrimitives, freeMemory, definitions);

				// use the passed prototype
				} else {
					typedObj = new prototype();
				}

				if (isNonNullObject) {

					// use map
					if (definitions[prototype.name]) {
						definition = definitions[prototype.name];

					// check for parent
					} else {

						definition = tbjson.definition;

						// only check for a parent if the definition is an object
						if (typeof definition == 'object') {

							for (let parent = prototype; parent = getParent(parent);) {
								if (!parent.tbjson || !parent.tbjson.definition) { break; }
								definition = Object.assign({}, parent.tbjson.definition, definition);
							}

							definitions[prototype.name] = definition;
						}
					}

					// fallback to the prototype if definition is an object
					if (definition == OBJECT) {
						for (let key in typedObj) {
							if (key in obj) {
								typedObj[key] = obj[key];
								if (freeMemory) { obj[key] = undefined; }
							}
						}

					// continue deeper
					} else {
						for (let key in definition) {
							if (key in obj) {
								typedObj[key] = cast(obj[key], definition[key], types, castPrimitives, freeMemory, definitions);
								if (freeMemory) { obj[key] = undefined; }
							}
						}
					}
				}

				// call the build function for post construction
				if (tbjson.build) {
					tbjson.build(typedObj);
				}

				return typedObj;

			// prototype is a raw definition
			} else {

				let typedObj = {};

				if (isNonNullObject) {
					for (let key in prototype) {
						if (key in obj) {
							typedObj[key] = cast(obj[key], prototype[key], types, castPrimitives, freeMemory, definitions);
							if (freeMemory) { obj[key] = undefined; }
						}
					}
				}

				return typedObj;
			}
		}
	}

	if (types && typeof prototype == 'string' && typeof obj == 'string' && prototype[0] == '@' && types[prototype]) {
		obj = types[prototype].deserialize(Buffer.from(obj, 'base64'));
	}

	// cast primitive (allow for null)
	if (castPrimitives && typeof prototype == 'number') {

		if (typeof obj != 'bool' && typeof obj != 'number' && typeof obj != 'string') {
			obj = null;

		// bool
		} else if (prototype == BOOL) {
			obj = !!obj;

		// string
		} else if (prototype == STRING) {
			obj = '' + obj;

		// number
		} else if (prototype > BOOL && prototype < STRING) {
			obj = +obj;
		}
	}

	// primitive, untyped, or prototyped
	return obj;
}