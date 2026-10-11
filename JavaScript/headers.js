const headers = [
    //{ label: "Home", href: "home-page.html" },
    { label: "About", href: "about.html" },
    { label: "Photos", href: "photos.html" },
    { label: "Professional", href: "professional.html" }
];

document.querySelectorAll("[data-site-navigation]").forEach((navigation) => {
    headers.forEach(({ label, href }) => {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label;
        navigation.appendChild(link);
    });
});
