---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "AtCoder In-Browser Playground"
  text: "by AyaExpTech"
  tagline: "Web extension provides a code editor/tester for AtCoder, which can be completed in the browser."
  actions:
    - theme: brand
      text: Usage
      link: /en/getting-started
    - theme: alt
      text: Why AIBP?
      link: /en/why-aibp

features:
    - title: Complete in Browser
      icon: 💻️
      details:
        Code execution is performed inside the browser (Web Worker).
        It does not depend on external environments such as AtCoder’s code test environment.
    - title: Advanced Code Editing Features
      icon: ⌨️
      details:
        Monaco Editor, used in Visual Studio Code, is integrated.
        For some languages, advanced editing features such as syntax highlighting and IntelliSense are available.
---

![](/visual.webp)
