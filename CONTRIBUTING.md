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

> [!NOTE]
> 👩‍💻 tl;dr - Run [`./local-setup.sh`](https://github.com/middlewarehq/middleware/blob/main/local-setup.sh), make changes, create a PR.


1. Run [`./local-setup.sh`](https://github.com/middlewarehq/middleware/blob/main/local-setup.sh).

    It'll run a bunch of checks for installed commands and binaries, such as node, jq, python, etc. It should work on all operating systems, but it's been tested best on MacOS.

    _If you run into issues, please look at the local-setup.sh file. It should be straight-forward enough for you to run it appropriately on your OS. We'll appreciate an issue being created for this, if it didn't work out of the box for you._

2. Run [`./dev.sh`](https://github.com/middlewarehq/middleware/blob/main/local-setup.sh).

    This is the actual dev server. We recommend going over the [README](https://github.com/middlewarehq/middleware#-developer-setup) for some additional details.
    Wait for everything to run.

    You'll see a "Status: Container ready! 🚀🚀" along with all statuses shown below for various services also being ready.

    At this point you can load up http://localhost:3333 and you're ready to start!
    <img width="672" alt="image" src="https://github.com/user-attachments/assets/f3897386-a624-4044-aae3-6fca2b1cdd44">


4. Then after adding the changes to staging, commit it normally. You will observe pre-commit hooks running.

    *NOTE*: The pre-commit hooks modifies the files and you have to again add the modified changes to staging and then commit

5. You can run the pre-commit without committing anything as
    ```bash
    pre-commit run --all-files
    // or
    pre-commit run --files [path/to/file]
    ```

## Labels

We use the following labels to categorize and prioritize issues:

- `bug`: Indicates that the issue reports a bug in the current implementation.
- `feature`: Indicates that the issue requests a new feature or enhancement.
- `advanced`: Issues that might take more time and effort. We offer swag to anyone completing any `advanced` tagged issues.
- `documentation`: Indicates that the issue involves updating or adding documentation.
- `help wanted`: Indicates that the issue is open for contributions and help from the community.
- `good first issue`: Indicates that the issue is suitable for newcomers to the project.
- `priority`: high/medium/low: Indicates the priority level of the issue.
- `discussion`: Indicates that the issue is open for discussion and feedback.

If you're creating a new issue, please apply the appropriate labels to help us better organize and address it.

## Feedback

We appreciate feedback and suggestions for improving DORA Metrics. If you have any ideas or comments, please don't hesitate to share them with us in the issue tracker or discussions section.

Thank you for contributing to DORA Metrics! 🚀
