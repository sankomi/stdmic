{
	const header = document.getElementById("header");
	const navOpen = document.getElementById("nav-open");
	const navClose = document.getElementById("nav-close");

	navOpen.addEventListener("click", event => {
		header.classList.add("header--show-nav");
	});
	navClose.addEventListener("click", event => {
		header.classList.remove("header--show-nav");
	});
}
