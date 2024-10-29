import getParent from '../utility/getParent';

/**
 * Return the flattened TBJSON definition. For prototypes that have parents.
 * 
 * @param { obj } obj - object to compute definition of 
 */
export default function definition(obj) {
	if (obj && typeof obj == 'object' && obj.constructor.tbjson && obj.constructor.tbjson.definition) {

		let definition = obj.constructor.tbjson.definition;

		for (let parent = obj.constructor; parent = getParent(parent);) {
			if (!parent.tbjson || !parent.tbjson.definition) { break; }
			definition = Object.assign({}, parent.tbjson.definition, definition);
		}

		return definition;
	}
}