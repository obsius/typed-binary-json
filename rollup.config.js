import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const plugins = [
	babel({
		babelHelpers: 'bundled',
		exclude: 'node_modules/**'
	})
];

export default [
	{
		external: [
			'fs'
		],
		input: 'src/Tbjson.js',
		output: {
			exports: 'auto',
			file: 'lib/index.js',
			format: 'cjs'
		},
		plugins
	},
	{
		input: 'src/Tbjson.js',
		output: {
			file: 'lib/browser.mjs',
			format: 'es'
		},
		plugins: [
			browserFs(),
			nodeResolve({ browser: true, preferBuiltins: false }),
			commonjs(),
			inject({ Buffer: ['buffer', 'Buffer'] }),
			...plugins
		]
	}
];

function browserFs() {
	return {
		name: 'browser-fs',
		resolveId(id) {
			return (id == 'fs') ? '\0browser-fs' : null;
		},
		load(id) {
			if (id == '\0browser-fs') {
				return [
					'const unavailable = () => { throw new Error("Files are not available in the browser"); };',
					'export default { createReadStream: unavailable, createWriteStream: unavailable, readFileSync: unavailable, unlinkSync: unavailable };'
				].join('\n');
			}
		}
	};
}
