const Remarkable = require("remarkable").Remarkable;
const remark = new Remarkable();
const inout = require("./inout");
const path = require("path");
const fs = require("fs").promises;

async function make() {
	await inout.rmdir("out");

	await inout.copydir("static", "out");
	await inout.copydir("file", path.join("out", "file"));

	const nav = await inout.readSetting("nav");
	
	const pages = await inout.listPage();
	await Promise.all(pages.map(async page => makePage(page, nav)));

	const posts = await inout.listPost();
	await Promise.all(posts.map(async post => makePost(post, nav)));
	
	await makePostPage(posts, nav);

	return true;
}

async function makePage(name, nav) {
	const page = await inout.readPage(name);
	const jsdom = await inout.readTemplate("page");
	if (!jsdom) return console.warn("cant find template (page) => not made!!");

	await makeHtml(page, nav, jsdom);
	await inout.writeHtml(name, jsdom);
}

async function makePost(name, nav) {
	const post = await inout.readPost(name);
	const jsdom = await inout.readTemplate("post");
	if (!jsdom) return console.warn("cant find template (post) => not made!!");

	await makeHtml(post, nav, jsdom);
	await inout.writeHtml(name, jsdom, "post");
}

async function makeHtml(data, nav, jsdom) {
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

	return jsdom;
}

async function makePostPage(posts, nav) {
	const jsdom = await inout.readTemplate("list");
	if (!jsdom) return console.error("cant find template (list) => fail!!");

	const listNode = jsdom.window.document.querySelector("[data-list=\"list\"]");
	if (!listNode) return console.error("cant find template (list/list) => fail!!");

	const itemTemp = listNode.querySelector("[data-list=\"item\"]");
	if (!itemTemp) return console.error("cant find template (list/item) => fail!!");

	posts.forEach(post => {
		const itemNode = itemTemp.cloneNode(true);
		const linkNode = itemNode.querySelector("[data-list=\"link\"]");
		if (!linkNode) return console.warn("cant find template (list/link) => not added!!");

		linkNode.textContent = post;
		post = post.toLowerCase().replaceAll(" ", "-").replaceAll(/[^-a-z0-9]/g, "");
		linkNode.href = `/post/${post}/`;
		itemTemp.parentNode.append(itemNode);
	});

	itemTemp.remove();

	await addNav(nav, jsdom);
	await inout.writeHtml("index", jsdom, "post");
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

module.exports = {make};
