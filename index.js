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


//file

app.get("/file/list/", async (req, res) => {
	res.json({
		success: true,
		list: await inout.listFile(),
	});
});

app.get("/file/open/:name/", async (req, res) => {
	const name = req.params.name;
	const file = await inout.readFile(name);
	if (file) res.sendFile(file);
	else res.sendStatus(404);
});

app.post("/file/save/", inout.writeFile, (req, res) => {
	res.send(true);
});

app.delete("/file/delete/:name/", async (req, res) => {
	const name = req.params.name;
	res.send(await inout.unlinkFile(name));
});


//setting

app.get("/setting/list/", async (req, res) => {
	res.json({
		success: true,
		list: await inout.listSetting(),
	});
});

app.get("/setting/open/:name/", async (req, res) => {
	const name = req.params.name;
	res.json(await inout.readSetting(name));
});

app.put("/setting/save/:name/", async (req, res) => {
	const name = req.params.name;
	const data = req.body;
	res.send(await inout.writeSetting(name, data));
});

app.delete("/setting/delete/:name/", async (req, res) => {
	const name = req.params.name;
	res.send(await inout.unlinkSetting(name));
});


//make

const html = require("./html");
app.put("/make/", async (req, res) => {
	res.send(await html.make());
});


//upload

const ftp = require("./ftp");
app.put("/upload/", async (req, res) => {
	res.send(await ftp.upload());
});

app.listen(port, () => console.log(`on ${port}`));
