const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const JSDOM = require("jsdom").JSDOM;
const fs = require("fs").promises;
const path = require("path");

app.use(express.static(path.join(__dirname, "editor")));
app.use(express.static(path.join(__dirname, "out")));
app.use(express.json({extended: false}));

app.get("/open/:name/", async (req, res) => {
	const name = req.params.name;
	res.json(await readData(name));
});

async function readData(name) {
	let data;
	try {
		const json = await fs.readFile(`data/${name}.json`);
		data = JSON.parse(json);
		if (data.name !== name) {
			console.warn("name mismatch => change data.name!");
			data.name = name;
		}
	} catch(err) {
		console.error("cant open data => create new data!!");
		data = {name, ...await getTemplateDefaults("page")};
	}
	return data;
}

async function getTemplateDefaults(temp) {
	let jsdom;
	let defaults = {};
	try {
		jsdom = new JSDOM(await fs.readFile(`template/${temp}.html`));
		const nodes = jsdom.window.document.querySelectorAll("[data-edit]");
		nodes.forEach(node => defaults[node.dataset.edit] = node.textContent);
	} catch (err) {
		console.error(err);
		console.log("cant find template => no defaults!!");
	}
	return defaults;
}

app.put("/save/:name/", async (req, res) => {
	const name = req.params.name;
	const data = req.body;

	const result = await writeData(name, data);
	res.send(result);
});

async function writeData(name, data) {
	if (data.name !== name) {
		console.error("name mismatch => data not writte!!");
		return false;
	}

	await fs.mkdir("data", {recursive: true});
	await fs.writeFile(`data/${data.name}.json`, JSON.stringify(data, null, 4));
	return true;
}

app.put("/make/:name/", async (req, res) => {
	const name = req.params.name;
	const data = await readData(name);
	if (data.name !== name) {
		console.error("name mismatch => fail!!");
		return res.send(false);
	}

	const jsdom = await readTemplate("page");
	if (!jsdom) {
		console.log("cant find template => fail!!");
		return res.send(false);
	}

	jsdom.window.document.title = data.title || "untitled";

	const nodes = jsdom.window.document.querySelectorAll("[data-edit]");
	const map = new Map();
	nodes.forEach(node => map.set(node.dataset.edit, node));

	for (const [key, value] of Object.entries(data)) {
		if (map.has(key)) map.get(key).textContent = value;
	}

	const nav = await readSetting("nav");
	await addNav(nav, jsdom);
	
	writeHtml(data, jsdom);
	res.send(true);
});

async function readTemplate(temp) {
	try {
		const jsdom = new JSDOM(await fs.readFile(`template/${temp}.html`));
		return jsdom;
	} catch (err) {
		console.error(err);
		return null;
	}
}

async function addNav(nav, jsdom) {
	const navNode = jsdom.window.document.querySelector("[data-nav]");
	const p = jsdom.window.document.createElement("p");
	p.textContent = "hello, nav";
	navNode.appendChild(p);
}

async function writeHtml(data, jsdom) {
	await fs.mkdir("out", {recursive: true});
	if (data.name === "index") {
		await fs.writeFile(`out/index.html`, jsdom.serialize());
	} else {
		await fs.mkdir(`out/${data.name}`, {recursive: true});
		await fs.writeFile(`out/${data.name}/index.html`, jsdom.serialize());
	}
}

app.get("/:name/open", async (req, res) => {
	const name = req.params.name;
	res.json(await readSetting(name));
});

async function readSetting(name) {
	let seting;
	try {
		const json = await fs.readFile(`setting/${name}.json`);
		setting = JSON.parse(json);
		if (setting.name !== name) {
			console.warn("name mismatch => change setting.name!");
			setting.name = name;
		}
	} catch(err) {
		console.error(`cant open ${name}  => create new ${name}!!`);
		setting = {};
	}
	return setting;
}

app.put("/:name/save/", async (req, res) => {
	const name = req.params.name;
	const setting = req.body;

	const result = await writeSetting(name, setting);
	res.send(result);
});

async function writeSetting(name, setting) {
	if (setting.name !== name) {
		console.error("name mismatch => setting not written!!");
		return false;
	}
	
	await fs.mkdir("setting", {recursive: true});
	await fs.writeFile(`setting/${setting.name}.json`, JSON.stringify(setting, null, 4));
	return true;
}

app.listen(port, () => console.log(`on ${port}`));
