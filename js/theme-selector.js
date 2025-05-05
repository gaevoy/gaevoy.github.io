window.addEventListener('DOMContentLoaded', () => {
    let theme = localStorage.getItem("theme");
    if (!theme) {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";
    }
    let isDarkTheme = theme === "dark";
    if (isDarkTheme) {
        document.body.classList.add("dark");
    }
    document.querySelector(".theme-switcher")
        .addEventListener('click', (e) => {
            isDarkTheme = !isDarkTheme;
            localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
            document.body.classList.toggle("dark");
        });
});