import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "win95-desktop": "#008080",
        "win95-grey": "#c0c0c0",
        "win95-navy": "#000080",
        "win95-dark-grey": "#808080",
        "win95-light-grey": "#dfdfdf",
        "win95-shadow": "#7f7f7f",
        "win95-input": "#ffffff",
        "win95-progress": "#0000a8",
      },
      fontFamily: {
        win95: ['"W95FA"', '"MS Sans Serif"', "Tahoma", "sans-serif"],
      },
      fontSize: {
        win95: ["11px", { lineHeight: "10px" }],
      },
    },
  },
  plugins: [],
};

export default config;
