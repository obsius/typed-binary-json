import babel from 'rollup-plugin-babel';

export default {
	input: 'src/Tbjson.js',
	output: {
		file: 'lib/Tbjson.js',
		format: 'cjs'
	},
	plugins: [
		babel({
			exclude: 'node_modules/**'
		})
	]
};