const navigationItems = [
    { label: "Professional", href: "professional.html" },
    { label: "Personal Projects", href: "personal-projects.html" },
    { label: "About", href: "about.html" }
];

const mainNavigation = document.querySelector(".main-navigation");
if (mainNavigation) {
    const githubLink = document.createElement("a");
    githubLink.href = "https://github.com/InitToZero/Jonathan-Ropp";
    githubLink.textContent = "GitHub for this site";
    githubLink.className = "github-link";
    mainNavigation.append(githubLink);
}

document.querySelectorAll("[data-site-navigation]").forEach((navigation) => {
    navigationItems.forEach(({ label, href }) => {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label;
        navigation.appendChild(link);
    });
});
