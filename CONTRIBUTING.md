# Contributing Guidelines

Thank you for considering contributing to **Middleware**! We welcome contributions from everyone.

## Issues

Before submitting a pull request, please check the [issue tracker](https://github.com/middlewarehq/middleware/issues?q=is%3Aissue+is%3Aopen+) to see if there are any existing issues or feature requests that you can help with. If you find an issue you'd like to work on, please leave a comment to let others know you're working on it to avoid duplicate efforts.

If you encounter a bug or have a feature request that's not already listed, please [create a new issue](https://github.com/middlewarehq/middleware/issues/new/choose) and provide as much detail as possible.

## Pull Requests

We use pull requests for code contributions. To submit a pull request:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with clear and concise messages. Refer [Making Commits](#making-commits)
4. Push your changes to your fork.
5. Submit a pull request to the main repository, detailing the changes you've made and referencing any relevant issues.

## Code Style

Please follow the existing code style and conventions used in the project. If you're unsure, feel free to ask for clarification in the pull request or issue comments. For linting and all refer [Making Commits](#making-commits)

## Making Commits

1. Pre-commit should be installed as a dev dependency already. If not then Create a virual environment [venv](https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/#create-and-use-virtual-environments) or [pyenv](https://github.com/pyenv/pyenv?tab=readme-ov-file#installation) and run the following command from project root dir:

    ```
    pip install -r backend/dev-requirements.txt --upgrade
    ```
    Also install the eslint for both `cli/` and `webserver/`. Please use node 16 for that
    *NOTE*: If NVM is not installed, install using [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)
    ```
    nvm install 16
    nvm use 16
    ```
    ```
    cd cli
    yarn add eslint@^8.40.0 eslint-plugin-import@^2.29.0 eslint-plugin-prettier@^5.0.1 eslint-plugin-react@^7.29.4 eslint-plugin-unused-imports@^3.0.0 --dev
    ```
    ```
    cd web-server
    yarn add eslint@^8.40.0 eslint-config-next@13.5.6 eslint-plugin-import@^2.29.0 eslint-plugin-prettier@^5.0.1 eslint-plugin-react@^7.29.4 eslint-plugin-unused-imports@^3.0.0 --dev
    ```
    Then install it:
    ```
    pre-commit install
    ```
2. Then after adding the changes to staging, commit it normally. You will observe pre-commit hooks running.

    *NOTE*: The pre-commit hooks modifies the files and you have to again add the modified changes to staging and then commit

3. You can run the pre-commit without committing anything as
    ```
    pre-commit run --all-files
    ```
    or
    ```
    pre-commit run --files [path/to/file]
    ```

*NOTE*: Make sure the terminal is using node 16 for the linting before committing(Until we upgrade node for webserver)

## Labels

We use the following labels to categorize and prioritize issues:

- `bug`: Indicates that the issue reports a bug in the current implementation.
- `feature`: Indicates that the issue requests a new feature or enhancement.
- `documentation`: Indicates that the issue involves updating or adding documentation.
- `help wanted`: Indicates that the issue is open for contributions and help from the community.
- `good first issue`: Indicates that the issue is suitable for newcomers to the project.
- `priority`: high/medium/low: Indicates the priority level of the issue.
- `discussion`: Indicates that the issue is open for discussion and feedback.

If you're creating a new issue, please apply the appropriate labels to help us better organize and address it.

## Feedback

We appreciate feedback and suggestions for improving DORA Metrics. If you have any ideas or comments, please don't hesitate to share them with us in the issue tracker or discussions section.

Thank you for contributing to DORA Metrics! 🚀
