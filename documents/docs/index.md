---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  text: "AtCoder In-Browser Playground"
  tagline: Web extension provides a code editor/tester for AtCoder, which can be completed in the browser
  actions:
    - theme: brand
      text: User Guide
      link: /guide/
    - theme: alt
      text: Contribution Guide
      link: /contribution/

features:
  - title: ブラウザ完結のコードテスト
    icon: 💻️
    details:
        コードの実行はブラウザ内(Web Worker)で行われます。<br>
        AtCoderのコードテストなどの外部環境に依存しません。
  - title: 高度なコード編集機能
    icon: 📝
    details:
        VSCodeでも使われているMonaco Editorを採用しています。<br>
        Syntax Highlightの他、一部言語ではさらに高度な補完機能も利用できます。
---
