require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const JSDOM = require("jsdom").JSDOM;
const fs = require("fs").promises;
const path = require("path");

const inout = require("./inout");

app.get("/editor/", (req, res) => {
	res.sendFile(path.join(__dirname, "editor/editor.html"));
});

app.use(express.static(path.join(__dirname, "out")));
app.use(express.json({extended: false}));
app.use(express.text());


//page

app.get("/page/list/", async (req, res) => {
	res.json({
		success: true,
		list: await inout.listPage(),
	});
});

app.get("/page/open/:name/", async (req, res) => {
	const name = req.params.name;
	res.json(await inout.readPage(name));
});

app.put("/page/save/:name/", async (req, res) => {
	const name = req.params.name;
	const data = req.body;
	res.send(await inout.writePage(name, data));
});

app.delete("/page/delete/:name/", async (req, res) => {
	const name = req.params.name;
	res.send(await inout.unlinkPage(name));
});


//post

app.get("/post/list/", async (req, res) => {
	res.json({
		success: true,
		list: await inout.listPost(),
	});
});

app.get("/post/open/:name/", async (req, res) => {
	const name = req.params.name;
	res.json(await inout.readPost(name));
});

app.put("/post/save/:name/", async (req, res) => {
	const name = req.params.name;
	const data = req.body;
	res.send(await inout.writePost(name, data));
});

app.delete("/post/delete/:name/", async (req, res) => {
	const name = req.params.name;
	res.send(await inout.unlinkPost(name));
});


///markdown

app.get("/markdown/list/", async (req, res) => {
	res.json({
		success: true,
		list: await inout.listMarkdown(),
	});
});

app.get("/markdown/open/:name/", async (req, res) => {
	const name = req.params.name;
	res.send(await inout.readMarkdown(name));
});

app.put("/markdown/save/:name/", async (req, res) => {
	const name = req.params.name;
	const data = req.body;
	res.send(await inout.writeMarkdown(name, data));
});

app.delete("/markdown/delete/:name/", async (req, res) => {
	const name = req.params.name;
	res.send(await inout.unlinkMarkdown(name));
});


const {Remarkable} = require("remarkable");
const remark = new Remarkable();
app.put("/make/", async (req, res) => {
	await fs.mkdir("out", {recursive: true});
	await fs.rm("out", {recursive: true});
	
	await copyFiles();

	const nav = await readSetting("nav");
	await fs.mkdir("page", {recursive: true});
	let names = await fs.readdir("page");
	
	names.forEach(async name => {
		const index = name.indexOf(".json");
		if (!~index) return;
		name = name.substring(0, index);
		
		const data = await inout.readPage(name);
		if (data.name !== name) {
			console.error("${name}: name mismatch => fail!!");
			return;
		}

		const jsdom = await readTemplate("page");
		if (!jsdom) {
			console.error("cant find page template => fail!!");
			return;
		}

		jsdom.window.document.title = data.title || "untitled";

		const nodes = jsdom.window.document.querySelectorAll("[data-edit]");
		const map = new Map();
		nodes.forEach(node => map.set(node.dataset.edit, node));

		for (const [key, value] of Object.entries(data)) {
			if (!map.has(key)) continue;
			if (value.indexOf("{{") === 0 && value.indexOf("}}") === value.length - 2) {
				map.get(key).innerHTML = remark.render(await inout.readMarkdown(value.slice(2, -2)));
			} else {
				map.get(key).textContent = value;
			}
		}

		await addNav(nav, jsdom);
		
		writeHtml(data.name, jsdom);
	});

	await fs.mkdir("post", {recursive: true});
	names = await fs.readdir("post");
	
	posts = [];

	await Promise.all(names.map(async name => {
		const index = name.indexOf(".json");
		if (!~index) return;
		name = name.substring(0, index);
		
		const post = await inout.readPost(name);
		if (post.name !== name) {
			console.error("${name}: name mismatch => fail!!");
			return;
		}

		const jsdom = await readTemplate("post");
		if (!jsdom) {
			console.error("cant find post template => fail!!");
			return;
		}

		jsdom.window.document.title = post.title || "untitled";

		const nodes = jsdom.window.document.querySelectorAll("[data-edit]");
		const map = new Map();
		nodes.forEach(node => map.set(node.dataset.edit, node));

		for (const [key, value] of Object.entries(post)) {
			if (!map.has(key)) continue;
			if (value.indexOf("{{") === 0 && value.indexOf("}}") === value.length - 2) {
				map.get(key).innerHTML = remark.render(await inout.readMarkdown(value.slice(2, -2)));
			} else {
				map.get(key).textContent = value;
			}
		}

		await addNav(nav, jsdom);
		
		writeHtml(post.name, jsdom, "post/");

		posts.push(post.name);
	}));
	
	(async () => {
		if (!posts.length) return;

		const jsdom = await readTemplate("list");
		if (!jsdom) return console.error("cant find list template => fail!!");

		const doc = jsdom.window.document;
		const listNode = doc.querySelector("[data-list=\"list\"]");
		if (!listNode) return console.error("list temp not found => fail!!");

		const itemTemp = listNode.querySelector("[data-list=\"item\"]");
		if (!itemTemp) return console.error("post item temp not found => fail!!");

		posts.forEach(post => {
			const itemNode = itemTemp.cloneNode(true);
			const linkNode = itemNode.querySelector("[data-list=\"link\"]");
			if (!linkNode) return console.warn("post link not found => link not added!!");

			linkNode.textContent = post;
			post = post.toLowerCase().replaceAll(" ", "-").replaceAll(/[^-a-z0-9]/g, "");
			linkNode.href = `/post/${post}/`;
			itemTemp.parentNode.append(itemNode);
		});

		itemTemp.remove();

		await addNav(nav, jsdom);

		writeHtml("index", jsdom, "post/");
	})();

	res.send(true);
});

async function copyFiles() {
	await fs.mkdir("out/file", {recursive: true});
	try {
		const files = await fs.readdir("static");
		await Promise.all(files.map(file => fs.copyFile(`static/${file}`, `out/${file}`)));
	} catch (err) {
		console.error("cant copy static files => not copied!!");
	}
	
	try {
		const files = await fs.readdir("file");
		await Promise.all(files.map(file => fs.copyFile(`file/${file}`, `out/file/${file}`)));
	} catch (err) {
		console.error("cant copy files => not copied!!");
	}
}

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

async function writeHtml(name, jsdom, path = "") {
	await fs.mkdir("out", {recursive: true});
	name = name.toLowerCase().replaceAll(" ", "-").replaceAll(/[^-a-z0-9]/g, "");
	if (name === "index") {
		await fs.mkdir(`out/${path}`, {recursive: true});
		await fs.writeFile(`out/${path}index.html`, jsdom.serialize());
	} else {
		await fs.mkdir(`out/${path}${name}`, {recursive: true});
		await fs.writeFile(`out/${path}${name}/index.html`, jsdom.serialize());
	}
}

app.get("/setting/list/", async (req, res) => {
	await fs.mkdir("setting", {recursive: true});
	const names = await fs.readdir("setting");
	
	const list = names.filter(name => ~name.indexOf(".json"))
		.map(name => {
			const index = name.indexOf(".json");
			return name.substring(0, index);
		});

	res.json({
		success: true,
		list,
	});
});

app.get("/setting/open/:name/", async (req, res) => {
	const name = req.params.name;
	res.json(await readSetting(name));
});

async function readSetting(name) {
	let seting;
	try {
		const json = await fs.readFile(`setting/${name}.json`);
		setting = JSON.parse(json);
		if (setting.name !== name) {
			console.warn("name mismatch => change setting.name!!");
			setting.name = name;
		}
	} catch (err) {
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

app.put("/setting/save/:name/", async (req, res) => {
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

app.delete("/setting/delete/:name/", async (req, res) => {
	const name = req.params.name;
	
	const result = await deleteSetting(name);
	res.send(result);
});

async function deleteSetting(name) {
	try {	
		await fs.rm(`setting/${name}.json`);
		return true;
	} catch (err) {
		console.error(`cant delete ${name} => setting not deleted!!`);
		return false;
	}
}

const ftp = require("basic-ftp");
app.put("/upload/", async (req, res) => {
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
	} catch (err) {
		console.error(err);
		console.error("error while uploading => fail!!");
		return res.send(false);
	} finally {
		client.close();
	}
	res.send(true);
});

const multer = require("multer");
const storage = multer.diskStorage({
	destination: (req, file, callback) => {
		callback(null, "file");
	},
	filename: (req, file, callback) => {
		let filename = file.originalname.trim();
		while (filename[0] === ".") filename = filename.substring(1);
		callback(null, filename);
	},
});

const upload = multer({storage});
app.post("/file/add/", upload.single("file"), (req, res, next) => {
	res.send(true);
});

app.get("/file/list/", async (req, res) => {
	await fs.mkdir("file", {recursive: true});
	const files = await fs.readdir("file");

	res.json(files);
});

app.get("/file/:name/", async (req, res) => {
	const file = path.join(__dirname, "file", req.params.name);
	const exists = await fs.stat(file)
		.then(() => true)
		.catch(() => false);

	if (exists) res.sendFile(file);
	else res.sendStatus(404);
});

app.delete("/file/remove/:name/", async (req, res) => {
	const name = req.params.name;
	await fs.mkdir("file", {recursive: true});
	await fs.unlink(`file/${name}`)
		.catch(err => {
			console.error("cant unlinkfile => not removed!!");
		});
	res.send(true);
});

app.listen(port, () => console.log(`on ${port}`));
