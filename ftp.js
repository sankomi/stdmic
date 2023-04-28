const ftp = require("basic-ftp");

async function upload() {
	const client = new ftp.Client();
	
	try {
		await client.access({
			host: process.env.FTP_HOST,
			user: process.env.FTP_USER,
			password: process.env.FTP_PASSWORD,
			secure: true,
		});
		await client.cd(process.env.FTP_PATH);
		await client.clearWorkingDir();
		await client.uploadFromDir("out");
		return true;
	} catch (err) {
		console.error("cant upload to server => fail!!");
		return false;
	} finally {
		client.close();
	}
}

module.exports = {upload};
