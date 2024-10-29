import getParent from '../utility/getParent';

/**
 * Serialize the typed object into a plain object ignoring typing rules, but obeying which properties should be ignored.
 * 
 * @param { string } obj - object to serialize
 */
export default function serialize(obj, definitions = {}) {

	// object or array
	if (obj && typeof obj == 'object') {

		// array
		if (Array.isArray(obj)) {

			let retObj = new Array(obj.length);

			for (let i = 0; i < obj.length; ++i) {
				retObj[i] = serialize(obj[i], definitions);
			}

			return retObj;

		// typed array (no need to check elements as they must all be primitives)
		} else if (ArrayBuffer.isView(obj)) {

			let retObj = new Array(obj.length);

			for (let i = 0; i < obj.length; ++i) {
				retObj[i] = obj[i];
			}

			return retObj;

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

				for (let key in definition) {
					retObj[key] = serialize(obj[key], definitions);
				}

			// plain
			} else {

				for (let key in obj) {
					retObj[key] = serialize(obj[key], definitions);
				}
			}

			return retObj;
		}
	}

	// primitive
	return obj;
}