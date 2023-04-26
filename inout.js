const path = require("path");
const fs = require("fs").promises;
const JSDOM = require("jsdom").JSDOM;


async function read(dir, name) {
	try {
		return await fs.readFile(path.join(dir, name));
	} catch (err) {
		console.error(`cant read file (${path.join(dir, name)}) => fail!!`);
		return null;
	}
}

async function write(dir, name, data) {
	try {
		await fs.mkdir(dir, {recursive: true});
		await fs.writeFile(path.join(dir, name), data);
		return true;
	} catch (err) {
		console.log(`cant write file (${path.join(dir, name)}) => fail!!`);
		return false;
	}
}

async function unlink(dir, name) {
	try {
		await fs.unlink(path.join(dir, name));
		return true;
	} catch (err) {
		console.error(`cant unlink file (${path.join(dir, name)}) => fail!!`);
		return false;
	}
}

async function list(dir) {
	try {
		return await fs.readdir(dir);
	} catch (err) {
		console.error(`cant list dir (${dir}) => fail!!`);
		return null;
	}
}


//json

async function readJson(dir, name) {
	try {
		const file = await read(dir, name + ".json");
		const json = JSON.parse(file);
		if (json.name !== name) {
			json.name = name;
			console.warn(`name mismatch (name = ${name}, json.name = ${json.name}) => set json.name = ${name}!!`);
		}
		return json;
	} catch (err) {
		console.error(`cant read json (${path.join(dir, name)}) => fail!!`);
		return null;
	}
}

async function writeJson(dir, name, json) {
	if (json.name !== name) {
		console.error(`name mismatch (name = ${name}, json.name = ${json.name}) => fail!!`);
		return false;
	}

	try {
		await write(dir, name + ".json", JSON.stringify(json, null, 4));
		return true;
	} catch (err) {
		console.error(`cant write json (${path.join(dir, name)}) => fail!!`);
		return false;
	}
}

async function unlinkJson(dir, name) {
	try {
		await unlink(dir, name + ".json");
		return true;
	} catch (err) {
		console.error(`cant unlink json (${path.join(dir, name)}) => fail!!`);
		return false;
	}
}

async function listJson(dir) {
	try {
		const names = await list(dir);
		list = names.filter(name => ~name.indexOf(".json"))
			.map(name => {
				const index = name.indexOf(".json");
				return name.substring(0, index);
			});
		return list;
	} catch (err) {
		console.error(`cant list json in dir (${dir}) => fail!!`);
		return null;
	}
}


//template

async function readEditDefaults(template) {
	try {
		const jsdom = new JSDOM(await fs.readFile(`template/${template}.html`));
		const nodes = jsdom.window.document.querySelectorAll("[data-edit]");
		const defaults = {};
		nodes.forEach(node => defaults[node.dataset.edit] = node.textContent);
		return defaults;
	} catch (err) {
		console.warn(`cant read template (${template}) => no defaults!!`);
		return null;
	}
}


//page

async function readPage(name) {
	const page = await readJson("page", name);
	if (page) return page;
	console.log(`cant read page (${name}) => create new page!!`);
	return {name, ...await readEditDefaults("page")};
}

async function writePage(name, json) {
	return await writeJson("page", name, json);
}

async function unlinkPage(name) {
	return await unlinkJson("page", name);
}

async function listPage() {
	return await listJson("page");
}

module.exports = {
	readPage, writePage, unlinkPage, listPage,
};
