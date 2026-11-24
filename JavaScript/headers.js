const headers = [
    { label: "Professional", href: "professional.html" },
    { label: "Personal", href: "personal.html" },
    { label: "About", href: "about.html" }
];

document.querySelectorAll("[data-site-navigation]").forEach((navigation) => {
    headers.forEach(({ label, href }) => {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label;
        navigation.appendChild(link);
    });
});
