/**
 * Convert a validation result object into an array with path selectors and errors.
 * 
 * @param { object | array } obj - validation result object to flatten
 */
export default function flattenValidation(obj, errors = [], path = []) {

	// recurse
	if (typeof obj == 'object' && obj != null) {

		// root of validation result is an array (validation result contains no arrays once inside)
		if (Array.isArray(obj)) {
			flattenValidation(obj[0], errors, path);

		// object
		} else {
			for (let key in obj) {
				flattenValidation(obj[key], errors, path.concat(key));
			}
		}

	// add to array
	} else {
		errors.push([path, obj]);
	}

	return errors;
}