/**
 * Convert a validation result into an array with path selectors and errors.
 * 
 * @param { array } validationResult - validation result to flatten
 */
export default function flattenValidation(validationResult) {
	return validationResult[1] > 0 ? flattenObj(validationResult[0]) : [];
}

/* internal */

function flattenObj(obj, errors = [], path = []) {

	// recurse
	if (typeof obj == 'object' && obj != null) {
		for (let key in obj) {
			flattenObj(obj[key], errors, path.concat(key));
		}

	// add to array
	} else {
		errors.push([path, obj]);
	}

	return errors;
}