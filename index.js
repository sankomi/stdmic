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
		console.log("cant open data => create new data!!");
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
		console.warn("cant find template => no defaults!!");
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
		console.error("name mismatch => data not written!!");
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
		console.error("cant find template => fail!!");
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
	const navNode = jsdom.window.document.querySelector("[data-nav=\"nav\"]");
	if (!navNode) return console.warn("nav temp not found => nav not added!!");

	const itemTemp = navNode.querySelector("[data-nav=\"item\"]");
	if (!itemTemp) return console.warn("nav item temp not found => nav not added!!");
	
	nav.items.forEach(item => {
		const itemNode = itemTemp.cloneNode(true);
		const linkNode = itemNode.querySelector("[data-nav=\"link\"]");
		if (!linkNode) return console.warn("nav link temp not found => link not added!!");
		
		linkNode.textContent = item.title;
		linkNode.href = item.link;
		itemTemp.parentNode.append(itemNode);

		const subnavNode = itemNode.querySelector("[data-nav=\"subnav\"]");
		if (!subnavNode) return console.warn("nav subnav temp not found => subnav not added!!");

		const subitemTemp = itemNode.querySelector("[data-nav=\"subitem\"]");
		if (!subitemTemp) return console.warn("nav subitem temp not found => subnav not added!!");

		if (item.subitems) {
			item.subitems.forEach(subitem => {
				const subitemNode = subitemTemp.cloneNode(true);
				const sublinkNode = subitemNode.querySelector("[data-nav=\"sublink\"]");
				if (!sublinkNode) return console.warn("nav sublink temp not found => sublink not added!!");
				
				sublinkNode.textContent = subitem.title;
				sublinkNode.href = subitem.link;
				subitemTemp.parentNode.append(subitemNode);
			});
		} else {
			itemNode.querySelector("[data-nav=\"subnav\"]").remove();
		}

		subitemTemp.remove();
	});
	
	itemTemp.remove();
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
		console.log(`cant open ${name}  => create new ${name}!!`);
		
		if (name === "nav") {
			setting = {
				name,
				items: [
					{
						title: "item",
						link: "",
						subitems: [
							{
								title: "subitem",
								link: "",
							}
						],
					}
				],
			};
		} else {
			setting = {name};
		}
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
