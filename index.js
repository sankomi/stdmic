const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const JSDOM = require("jsdom").JSDOM;
const fs = require("fs").promises;
const path = require("path");

app.use(express.static(path.join(__dirname, "out")));
app.use(express.json({extended: false}));

app.get("/open/:page/", async (req, res) => {
	const page = req.params.page;

	let data;
	try {
		const json = await fs.readFile(`data/${page}.json`);
		data = JSON.parse(json);
		if (data.page !== page) {
			console.warn("page mismatch => change data.page!!");
			data.page = page;
			console.log(data);
		}
	} catch(err) {
		console.error("cant open data => create new data!!");
		data = {page};
	}

	let defaults;
	try {
		const json = await fs.readFile(`template/page.json`);
		defaults = JSON.parse(json);
	} catch(err) {
		console.error("cant open vars => use empty defaults!!");
		defaults = {};
	}
	
	for (const [key, value] of Object.entries(defaults)) {
		if (!data[key]) data[key] = value;
	}

	res.json(data);
});

app.post("/save/:page/", async (req, res) => {
	const page = req.params.page;
	const data = req.body;

	if (data.page !== page) {
		console.error("page mismatch => fail!!");
		return res.send("fail");
	}

	let jsdom;
	try {
		jsdom = new JSDOM(await fs.readFile(`template/page.html`));
		jsdom.window.document.title = data.title || "untitled";
	} catch (err) {
		console.error(err);
		console.log("cant find template => fail!!");
		return res.send("fail");
	}

	const nodes = jsdom.window.document.querySelectorAll("[data-edit]");
	
	const map = new Map();
	nodes.forEach(node => map.set(node.dataset.edit, node));

	for (const [key, value] of Object.entries(data)) {
		if (map.has(key)) map.get(key).textContent = value;
	}
	
	await fs.mkdir("out", {recursive: true});
	await fs.mkdir("data", {recursive: true});
	if (page === "index") {
		await fs.writeFile(`out/index.html`, jsdom.serialize());
	} else {
		await fs.mkdir(`out/${page}`, {recursive: true});
		await fs.writeFile(`out/${page}/index.html`, jsdom.serialize());
	}
	await fs.writeFile(`data/${page}.json`, JSON.stringify(data));
	res.sendStatus(200);
});

app.listen(port, () => console.log(`on ${port}`));
