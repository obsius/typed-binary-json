import getParent from '../utility/getParent';
import cast from './cast';

/**
 * Clone the typed object into a prototyped object ignoring typing rules, but obeying which properties should be ignored.
 * 
 * @param { string } obj - object to serialize
 */
export default function clone(obj, definitions = {}) {

	// object or array
	if (obj && typeof obj == 'object') {

		// array
		if (Array.isArray(obj)) {

			let retObj = new Array(obj.length);

			for (let i = 0; i < obj.length; ++i) {
				retObj[i] = clone(obj[i], definitions);
			}

			return retObj;

		// typed array
		} else if (ArrayBuffer.isView(obj)) {

			return obj.slice();

		// object
		} else {

			let retObj = {};

			// typed
			if (typeof obj.constructor == 'function' && obj.constructor.tbjson && obj.constructor.tbjson.definition) {

				let definition = definitions[obj.constructor.name];

				// do a lookup for the parent definitions and flatten into one
				if (!definition) {

					definition = obj.constructor.tbjson.definition;

					for (let parent = obj.constructor; parent = getParent(parent);) {
						if (!parent.tbjson || !parent.tbjson.definition) { break; }
						definition = Object.assign({}, parent.tbjson.definition, definition);
					}

					definitions[obj.constructor.name] = definition;
				}

				let constructor = obj.constructor;

				// unbuild
				if (constructor.tbjson.unbuild) {
					obj = constructor.tbjson.unbuild(obj);
				}

				// custom clone function
				if (constructor.tbjson.clone) {
					retObj = constructor.tbjson.clone(obj);

				// generic clone function
				} else {
					
					for (let key in definition) {
						retObj[key] = clone(obj[key], definitions);
					}

					// cast
					retObj = cast(retObj, constructor);
				}

			// date object
			} else if (obj instanceof Date) {
				retObj = new Date(obj.getTime());

			// plain
			} else {

				for (let key in obj) {
					retObj[key] = clone(obj[key], definitions);
				}
			}

			return retObj;
		}
	}

	// primitive
	return obj;
}