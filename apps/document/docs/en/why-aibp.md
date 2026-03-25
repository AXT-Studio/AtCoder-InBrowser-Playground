# Why AIBP?

AtCoder In-Browser Playground (AIBP) is a web extension that provides a browser-only code editor and tester directly on AtCoder problem pages.
Simply by installing the extension, AIBP becomes available and offers richer functionality than AtCoder’s built-in code test screen, making it easier to set up a comfortable competitive programming environment.

## Background

Before AIBP was released, people joining AtCoder contests generally wrote code in one of the following two ways:

- **Using AtCoder’s built-in code test feature**
    - Each AtCoder contest provides a "Code Test" page.
    - This page includes Ace Editor, allowing users to edit and test code in the browser.
    - However, compared with editors like Visual Studio Code, Ace Editor has limited features, and many users do not find it very comfortable for coding.
- **Setting up a local environment and using a local code editor**
    - Another option is to set up tools such as [online-judge-tools](https://github.com/online-judge-tools/oj), write code in a local editor, and run tests from the command line.
    - This approach has advantages, such as freedom to use your preferred editor and smoother submission flow once you get used to it.
    - However, environment setup takes effort and is often a high barrier, especially for beginners.

**AtCoder In-Browser Playground** was created to bridge the gap between these two approaches.

## Features

AIBP is an extension that provides both a code editor and a tester. By simply installing AIBP in your browser, you can transform AtCoder problem pages into a more comfortable environment from problem reading to submission.

Its key highlights are as follows:

- **Powered by Monaco Editor**
    - It integrates Monaco Editor, the same editor used in VS Code.
    - Especially for users familiar with VS Code, it provides a very similar and familiar editing experience.
- **Browser-only code testing**
    - Code execution runs inside the browser (Web Worker).
    - This eliminates waiting for remote test execution. As soon as you click the "Run Test" button, testing starts immediately.
- **Submission preparation support**
    - It includes a button that automatically inserts your edited code into the source code input field at the bottom of the problem page.
    - With just three clicks, you can submit the code you edited.

## Support for JavaScript and TypeScript

AIBP supports JavaScript and TypeScript as first-class languages.
There are several reasons for this:

1. **Because it is the successor to AtCoder-JavaScript-Tester**
    - AIBP was developed as the successor to [UserScript "AtCoder-JavaScript-Tester"](https://github.com/AXT-AyaKoto/AtCoder-JavaScript-Tester).
    - AIBP was born from the desire to make AtCoder-JavaScript-Tester easier to use and more feature-rich.
      For that reason, AIBP places strong emphasis on JavaScript and TypeScript support.
2. **Because JavaScript and TypeScript are approachable languages**
    - JavaScript can be considered one of the more approachable programming languages.
        - It runs easily in the browser, reducing the risk of giving up during environment setup.
        - Its syntax is relatively simple and beginner-friendly.
        - Learning resources are abundant, and plenty of information is available online.
            - In particular, having [MDN Web Docs](https://developer.mozilla.org/ja/) available in many languages is a major help for learning.
        - Moving from JavaScript to TypeScript is also not a high hurdle, and TypeScript is relatively approachable as well.
    - At the time of AIBP’s release, AtCoder users of JavaScript/TypeScript were still few.
      Even so, for people already learning JavaScript/TypeScript and those just starting programming, we hope JavaScript/TypeScript becomes a more accessible option when starting AtCoder.

In addition to features shared across all supported languages, AIBP also provides the following special features for JavaScript and TypeScript:

- IntelliSense
    - Monaco Editor’s IntelliSense features are available, including code completion and function signature help.
- Type error display
    - TypeScript type errors are shown in the editor.
    - However, type errors are ignored by the "Run Test" feature, so please check type errors directly in the editor.
- Warnings for special caveats
    - A warning is shown when you try to submit code that has a high chance of causing an RE (Runtime Error).

