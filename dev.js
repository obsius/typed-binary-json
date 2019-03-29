import fs from 'fs';
import Tbjson from './src/Tbjson';


(async function() {

	try {
		

		let tbjson = new Tbjson();


		let data;
		let buffer;

	//	await tbjson.serializeToFile('tbjson.__tbj', root);

	//	buffer = tbjson.serializeToBuffer(root);

		//fs.writeFileSync('___M.json', tbjson.getHeaderAsBuffer());
		console.time();

		data = tbjson.parseFileAsBuffer('aaad.op3');

		console.log(data);
		//console.log(data.b.as);
		//console.log(JSON.stringify(data));

		console.timeEnd();
	} catch(e) {
		console.error(e);
	}

	//setTimeout(() => {}, 600000);

})();