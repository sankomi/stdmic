{
	const name = document.querySelector("#name");
	const open = document.querySelector("#open");
	const save = document.querySelector("#save");
	const make = document.querySelector("#make");
	const editor = document.querySelector("#editor");

	open.addEventListener("click", event => {
		fetch(`/open/${name.value}/`)
			.then(res => res.json())
			.then(json => editor.value = JSON.stringify(json, null, 4));
	});

	save.addEventListener("click", event => {
		fetch(`/save/${name.value}/`, {
			method: "PUT",
			headers: {
				"Accept": "application/json",
				"Content-Type": "application/json",
			},
			body: editor.value,
		})
			.then(res => res.json())
			.then(console.log);
	});

	make.addEventListener("click", event => {
		fetch(`/make/${name.value}/`, {
			method: "PUT",
			headers: {
				"Accept": "application/json",
				"Content-Type": "application/json",
			},
		})
			.then(res => res.json())
			.then(console.log);
	});
}
