/** @param {import('http').IncomingMessage} req */
export function getRawBody(req) {
	return new Promise((fulfil, reject) => {
		const h = req.headers;

		if (!h['content-type']) {
			fulfil(null);
			return;
		}

		req.on('error', reject);

		const length = Number(h['content-length']);

		/** @type {Uint8Array} */
		let data;

		if (!isNaN(length)) {
			data = new Uint8Array(length);

			let i = 0;

			req.on('data', (chunk) => {
				// TODO maybe there's a simpler way to copy data between buffers?
				for (let j = 0; j < chunk.length; j += 1) {
					data[i++] = chunk[j];
				}
			});
		} else {
			// https://github.com/jshttp/type-is/blob/c1f4388c71c8a01f79934e68f630ca4a15fffcd6/index.js#L81-L95
			if (h['transfer-encoding'] === undefined) {
				fulfil(null);
				return;
			}

			data = new Uint8Array(0);

			req.on('data', (chunk) => {
				const new_data = new Uint8Array(data.length + chunk.length);

				for (let i = 0; i < data.length; i += 1) {
					new_data[i] = data[i];
				}

				for (let i = 0; i < chunk.length; i += 1) {
					new_data[i + data.length] = chunk[i];
				}

				data = new_data;
			});
		}

		req.on('end', () => {
			const [type] = h['content-type'].split(/;\s*/);

			if (type === 'application/octet-stream') {
				fulfil(data.buffer);
			}

			const decoder = new TextDecoder(h['content-encoding'] || 'utf-8');
			fulfil(decoder.decode(data));
		});
	});
}
