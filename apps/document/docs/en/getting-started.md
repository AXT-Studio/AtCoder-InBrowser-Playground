# Getting Started with AIBP

## Installation

AtCoder In-Browser Playground is a browser extension available for both Chrome and Firefox.
You can install it from the Chrome Web Store or Firefox Add-ons.

- [Chrome Web Store](#) (Coming soon)
- [Firefox Add-ons](https://addons.mozilla.org/ja/firefox/addon/atcoder-in-browser-playground/)

## Usage

Once you complete the [installation](./../intro/installation.md) of the extension, open any AtCoder problem page!
If you're not sure where to start, try opening [AtCoder Beginners Selection - PracticeA "Welcome to AtCoder"](https://atcoder.jp/contests/abs/tasks/practice_1).
Then, the problem statement should shift to the left side of the page, and a new window should appear on the right.
This new window is AtCoder In-Browser Playground.

![](/visual.webp)

### Basic Usage

- In the "Settings" tab, select the language you want to use.
    - The language selected here is reflected in syntax highlighting in the code editor and in the code test execution environment.
- Write your code in the code editor at the top.
- Press the "Run Test" button in the "Test" tab to run your code in the browser, and the output for the input test case will be shown below.
- Press the "Prepare Submission" button in the "Operations" tab to automatically copy your code to the submission text area.
    - After that, press the "Submit" button in the submission text area to submit your code.

## Feature Details

### Code Editor Area (Top of the Screen)

The code editor area is a code editing space powered by Monaco Editor.
Here, you can edit code and view code-related errors.

Its usage is generally the same as VSCode.

### Operation Tabs (Bottom of the Screen)

There are three tabs at the bottom of the AIBP UI.
From left to right: **Operations** tab, **Test** tab, and **Settings** tab.

#### Operations Tab (Left)

![Operations tab UI](./tab_operation.webp)

- **Template** button
    - Clicking this button inserts a code template for the selected language into the code editor.
    - However, if code already exists in the editor, a confirmation dialog is shown first.
- **Prepare Submission** button
    - Automatically copies the code currently written in the code editor to the source code input field at the bottom of the problem page.
    - It also automatically scrolls to the position of the source code input field.

#### Test Tab (Center)

![Test tab UI](./tab_test.webp)

- **Testcase Input** field
    - Enter test case input here.
- **Expected Output** field
    - Enter the expected output for the Testcase Input here.
- **Run Test** button
    - Runs the code written in the code editor using the entered Testcase Input, then compares the output with Expected Output.
- **Status** field
    - Displays the result of Run Test.
    - Statuses such as AC, WA, TLE, and RE are shown.
- **Exec. Time** field
    - Displays the time taken to execute the code.
- **Example Auto-Exec.** button group
    - Displayed only when sample input/output can be automatically extracted from the problem statement.
    - Copies the corresponding sample input/output to Testcase Input and Expected Output, then automatically runs the test.
- **Actual Stdout** field
    - Displays the actual standard output produced by running the code.
- **Actual Stderr** field
    - Displays the actual standard error produced by running the code.

#### Settings Tab (Right)

![Settings tab UI](./tab_settings.webp)

All setting items are listed below.

- Test
    - Test Time Limit (ms)
        - Sets the execution time limit for code testing in milliseconds.
        - When the problem page is opened or reloaded, the time limit in the statement is automatically extracted and set as the initial value.
        - If extraction of the time limit from the problem statement fails, the initial value is `2000` ms.
    - Allowable Error
        - Sets how much numerical error is allowed when comparing outputs in code tests.
        - The default value is `1e-6`(10 raised to the power of -6).
        - If you are unfamiliar with the topic of "floating-point error", you generally do not need to change this.
- Editor (Need Reload)
    - Language (IntelliSense, Syntax Highlighting)
        - Selects the language used for code written in the editor.
        - The language selected here is reflected in syntax highlighting in the code editor and in the code test execution environment.
        - If you change the language here, you need to reload the browser to fully apply the change.

