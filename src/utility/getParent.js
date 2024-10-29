/**
 * Return the parent of a prototype.
 * 
 * @param { function } prototype - prototype to check for parent of 
 */
export default function getParent(prototype) {
	let parent = prototype ? Object.getPrototypeOf(prototype) : null;
	return (parent && parent.name) ? parent : null;
}