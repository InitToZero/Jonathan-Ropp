const h = React.createElement;

function HomePage() {
    return h(
        "section",
        { className: "homepage-intro" },
        h("h2", null, "Welcome"),
        h("p", null, "Great things start small...")
    );
}

const homepageRoot = document.getElementById("homepage-root");

if (homepageRoot) {
    ReactDOM.createRoot(homepageRoot).render(h(HomePage));
}
