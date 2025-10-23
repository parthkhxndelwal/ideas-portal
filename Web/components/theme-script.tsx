export const ThemeScript = () => {
  const script = `
    (function() {
      try {
        const saved = localStorage.getItem("theme");
        const theme = saved || "dark"; // Default to dark mode
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        }
      } catch (e) {
        // In case localStorage is not available
      }
    })();
  `

  return (
    <script 
      id="theme-switcher" 
      dangerouslySetInnerHTML={{ __html: script }} 
    />
  )
}
