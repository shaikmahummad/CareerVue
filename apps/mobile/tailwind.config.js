/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Canvas
        "bg":                   "#050508",
        "surface":              "#13121b",
        "surface-container":    "#1f1f28",
        "surface-container-high":    "#2a2933",
        "surface-container-highest": "#35343e",
        "surface-container-low":     "#1b1b24",
        "surface-container-lowest":  "#0e0d16",
        "surface-variant":      "#35343e",
        // Text
        "on-surface":           "#e4e1ee",
        "on-surface-variant":   "#c7c4d8",
        // Primary
        "primary":              "#c4c0ff",
        "primary-container":    "#8781ff",
        "on-primary":           "#2000a4",
        "on-primary-container": "#1b0091",
        "inverse-primary":      "#4f44e2",
        // Secondary
        "secondary":            "#a2e7ff",
        "secondary-container":  "#00d2fd",
        // Tertiary
        "tertiary":             "#ffb785",
        "tertiary-container":   "#db761f",
        // Semantic
        "error":                "#ffb4ab",
        "error-container":      "#93000a",
        // Borders
        "outline":              "#918fa1",
        "outline-variant":      "#464555",
        // Nav
        "tabbar":               "#080810",
      },
      fontFamily: {
        sans:  ["HankenGrotesk_400Regular", "System", "sans-serif"],
        mono:  ["JetBrainsMono_500Medium", "monospace"],
        grotesk: ["HankenGrotesk_700Bold"],
      },
      fontSize: {
        "large-title": [34, { lineHeight: "41px", letterSpacing: "-0.5px", fontWeight: "700" }],
        "title-1":     [28, { lineHeight: "34px", letterSpacing: "-0.4px", fontWeight: "700" }],
        "title-2":     [22, { lineHeight: "28px", letterSpacing: "-0.3px", fontWeight: "600" }],
        "title-3":     [20, { lineHeight: "25px", letterSpacing: "-0.2px", fontWeight: "600" }],
        "body":        [17, { lineHeight: "22px", letterSpacing: "-0.1px", fontWeight: "400" }],
        "caption-mono":[12, { lineHeight: "16px", letterSpacing: "0.5px",  fontWeight: "500" }],
      },
      borderRadius: {
        "xl":  "12px",
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
      },
    },
  },
  plugins: [],
};
