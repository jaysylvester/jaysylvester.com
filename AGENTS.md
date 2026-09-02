# Repository instructions

## General instructions

- You may not leave the sandbox without permission.
- You may not interact with the production environment without permission.
- You may run read-only queries on the development database without asking.


## Terminal commands

- You may run any command that involves simple file reads (grep, git diff, etc.).
- You may run any command related to tests or code quality (npx eslint, etc.) provided they are non-destructive.


## General testing

- Use existing test scripts when possible. Suggest adding test scripts that don't exist.


## Browser testing

- If your local browser tools aren't available, you're likely working within the VS Code extension, so use Playwright MCP for browser testing.
- Clean up your temporary files (screenshots, etc.) after your testing is complete.
