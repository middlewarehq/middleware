<br /><br />
<p align="center">
<a href="https://www.middlewarehq.com/"><img src="https://github.com/middlewarehq/middleware/blob/main/media_files/logo.png" alt="Middleware Logo" width=300px></a>
</p>

<p align="center"><b>Open-source engineering management that unlocks developer potential</b></p>

<p align="center">
<a href="https://github.com/middlewarehq/middleware/actions/workflows/build.yml"><img alt="continuous integration" src="https://img.shields.io/github/actions/workflow/status/middlewarehq/middleware/build.yml?branch=main&label=build&style=for-the-badge"></a>
<a href="https://github.com/middlewarehq/middleware/graphs/commit-activity"><img alt="Commit activity per month" src="https://img.shields.io/github/commit-activity/m/middlewarehq/middleware?style=for-the-badge" /></a>
<a href="https://github.com/middlewarehq/middleware/graphs/contributors"><img alt="contributors" src="https://img.shields.io/github/contributors-anon/middlewarehq/middleware?color=yellow&style=for-the-badge" /></a>
<br/>
<a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/apache%202.0-purple.svg?style=for-the-badge&label=license" alt="license" /></a>
<img src="https://img.shields.io/github/stars/middlewarehq/middleware?style=for-the-badge" alt="Stars" />
</p>

<p align="center"><a href="https://mhq.link/oss-community">Join our Open Source Community</a></p>

![Middleware Opensource](https://github.com/middlewarehq/middleware/blob/main/media_files/banner.gif)


## Introduction
**Middleware** is an open-source tool designed to help engineering leaders measure and analyze the effectiveness of their teams using the [DORA metrics](https://dora.dev). The DORA metrics are a set of [four key values](https://dora.dev/guides/dora-metrics-four-keys/) that provide insights into software delivery performance and operational efficiency.

They are:
- **Deployment Frequency**: The frequency of code deployments to production or an operational environment.
- **Lead Time for Changes**: The time it takes for a commit to make it into production.
- **Mean Time to Restore**: The time it takes to restore service after an incident or failure.
- **Change Failure Rate**: The percentage of deployments that result in failures or require remediation.

**Table of Contents**

- [Middleware - Open Source](#introduction)
  - [Features](#-features)
  - [Quick Start](#-quick-start)
    - [Installing Middleware](#-installing-middleware)
    - [Troubleshooting](#%EF%B8%8F-troubleshooting)
  - [Developer Setup](#-developer-setup)
    - [Using Gitpod](#%EF%B8%8F-using-gitpod)
    - [Using Docker](#-using-docker)
    - [Manual Setup](#%EF%B8%8F-manual-setup)
  - [Usage](#-usage)
  - [How we Calculate DORA](#-how-we-calculate-dora-metrics)
  - [Roadmap](#%EF%B8%8F-roadmap)
  - [Contributing guidelines](#%EF%B8%8F-contributing-guidelines)
  - [Developer Automations](#-developer-automations)
  - [Security guidelines](#%EF%B8%8F-security-guidelines)
  - [License](#license)

## 🚀 Features

- Integration with various CI/CD tools
- Automated collection and analysis of DORA metrics
- Visualization of key performance indicators
- Customizable reports and dashboards
- Integration with popular project management platforms

## ✨ Quick Start

### ⭐ Installing Middleware
* Ensure that you have [docker](https://www.docker.com/products/docker-desktop/) installed and running.

* Open the terminal and run the following command:

  ```bash
  docker volume create middleware_postgres_data
  docker volume create middleware_keys
  docker run --name middleware \
             -p 3333:3333 \
             -p 9696:9696 \
             -p 9697:9697 \
             -v middleware_postgres_data:/var/lib/postgresql/data \
             -v middleware_keys:/app/keys \
             -d middlewareeng/middleware:latest
  docker logs -f middleware
  ```

- Wait for sometime for the services to be up.

- The app shall be available on your host at http://localhost:3333.

## 🛠️ Troubleshooting
1. In case you want to stop the container, run the following command:

   ```bash
   docker stop middleware
   ```

2. In order to fetch latest version from remote and then starting the system, use following command:
   ```bash
   docker pull middlewareeng/middleware:latest
   docker rm -f middleware || true
   docker run --name middleware \
              -p 3333:3333 \
              -v middleware_postgres_data:/var/lib/postgresql/data \
              -v middleware_keys:/app/keys \
              -d middlewareeng/middleware:latest
   docker logs -f middleware
   ```

3. If you see an error like: `Conflict. The container name "/middleware" is already in use by container`. \
   Then run following command before running the container again:
   ```bash
   docker rm -f middleware
   ```

4. If you wish to delete all the data saved in the container, you can delete the volumes created by running the following command:
   ```bash
   docker volume rm middleware_postgres_data middleware_keys
   ```


## 👩‍💻 Developer Setup

### ☁️ Using GitPod

Gitpod enables development on remote machines and helps you get started with Middleware if your machine does not support running the project locally.

If you want to run the project locally you can [setup using docker](#-using-docker) or [setup everything manually](#-manual-setup).

1. Click the button below to open this project in Gitpod.

2. This will open a fully configured workspace in your browser with all the necessary dependencies already installed.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/middlewarehq/middleware)

After initialization, you can access the server at port 3333 of the gitpod instance.

### 🐳 Using Docker

> [!IMPORTANT]
> We recommend minimum 16GB RAM when developing locally.

If you don't have docker installed, please install docker [over here](https://docs.docker.com/get-docker/).
Make sure docker is running.

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/middlewarehq/middleware
   ```

2. **Navigate to the Project Directory**:

   ```bash
   cd middleware
   ```

3. **Run `dev.sh` script in the project root 🪄**\
    `./dev.sh` creates a `.env` file with required development environments and runs a CLI with does all the heavy lifting from tracking the container with `docker compose watch` to providing you with logs from different services.\
    The usage is as follows:
   ```bash
   ./dev.sh
   ```
   You may update the `env.example` and set `ENVIRONMENT=prod` to run it in production setup.\
   Further if any changes are required to be made to ports, you may update the `docker-compose.yml` file, accordingly.
4. **Access the Application**:
   Once the project is running, access the application through your web browser at http://localhost:3333.
   Further, other services can be accessed at:
    - The analytics server is available at http://localhost:9696.
    - The sync server can be accessed at http://localhost:9697.
    - The postgres database can be accessed at host: `localhost`, port: `5434`, username: `postgres`, password: `postgres`, db name: `mhq-oss`.
    - The redis server can be accessed at host: `localhost`, port: `6385`.

5. **View the logs**: Although the CLI tracks all logs, the logs of services running inside the container can be viewed in different terminals using the following commands:

   **Frontend logs**
   ```bash
   docker exec -it middleware-dev tail --lines 500 -f /var/log/web-server/web-server.log
   ```
   **Backend api server logs**
   ```bash
   docker exec -it middleware-dev tail --lines 500 -f /var/log/apiserver/apiserver.log
   ```
   **Backend sync server logs**
   ```bash
   docker exec -it middleware-dev tail --lines 500 -f /var/log/sync_server/sync_server.log
   ```
   **Redis logs**
   ```bash
   docker exec -it middleware-dev tail --lines 500 -f /var/log/redis/redis.log
   ```
   **Postgres logs**
   ```bash
   docker exec -it middleware-dev tail --lines 500 -f /var/log/postgres/postgres.log
   ```


## 🛠️ Manual Setup

To set up middleware locally, follow these steps:

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/middlewarehq/middleware.git
   ```

2. **Navigate to the Project Directory**:

   ```bash
   cd middleware
   ```

3. **Run Redis and Postgres Containers**:

    If you don't have docker installed, please install docker [over here](https://docs.docker.com/get-docker/)

    Run the following commands to run Postgres and Redis using docker.

     ```bash
     cd database-docker && docker-compose up -d
     ```

    If you don't prefer Docker, you can choose to install [Postgres](https://www.postgresql.org/download/) and [Redis](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/) manually.

    Once you are done with using or developing Middleware, you can choose to close these running container. (NOTE: Don't do this if you are following this document and trying to run Middleware.)

    ```bash
    cd database-docker/
    docker-compose down -v
    ```

4. **Generate Encryption keys**:

    Generate encryption keys for the project by running the following command in the project root directory:

    ```bash
    cd setup_utils && . ./generate_config_ini.sh && cd ..
    ```

5. **Backend Server Setup**

    - Install python version `3.11.6`

      - For this you can install python from [over here](https://www.python.org/downloads/) if you don't have it on your machine.
      - Install pyenev

        ```bash
        git clone https://github.com/pyenv/pyenv.git ~/.pyenv
        ```

      - Add pyenv to your shell's configuration file (.bashrc, .bash_profile, .zshrc, etc.):

        ```bash
        echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
        echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
        ```

      - Reload your shell:
        ```
        source ~/.bashrc
        ```
    - Move backend directory to create a virtual environment

      ```bash
      cd backend
      python -m venv venv
      ```

    - Activate virtual environment

      ```bash
      . venv/bin/activate
        ```

    - Install Dependencies

      ```bash
      pip install -r requirements.txt -r dev-requirements.txt
      ```

    - Create a `.env` file in the root directory and add the following environment variables, replacing the values with your own if needed:

      ```text
      DB_HOST=localhost
      DB_NAME=mhq-oss
      DB_PASS=postgres
      DB_PORT=5434
      DB_USER=postgres
      REDIS_HOST=localhost
      REDIS_PORT=6385
      ANALYTICS_SERVER_PORT=9696
      SYNC_SERVER_PORT=9697
      DEFAULT_SYNC_DAYS=31
      ```

    - Start the backend servers

      - Change Directory to analytics_server
        ```bash
        cd analytics_server
        ```

      - For backend analytics server:
        ```bash
        flask --app app --debug run --port 9696
        ```

      - For backend sync server:
        ```bash
        flask --app sync_app --debug run --port 9697
        ```
        NOTE: Open this sync sever in a new terminal window after activating the virtual environment only after starting analytics server.

6. **Web Server Setup**

   - Install NodeJs 22.x either [manually](https://nodejs.org/en/download) or using a tool like [nvm](https://github.com/nvm-sh/nvm) or [volta](https://volta.sh/).

   - Install `yarn` package manager
     ```bash
     npm install --global yarn
     ```
   - Change Directory to web-server and install packages
     ```bash
     cd web-server
     yarn
     ```

   - Start the web-server
     ```bash
     yarn dev
     ```

7. **Access the Application**:
   Once the project is running, access the application through your web browser at http://localhost:3333. \
   Additionally:
   - The analytics server is available at http://localhost:9696.
   - The sync server can be accessed at http://localhost:9697.


# 🚀 Usage

![Product Demo](https://github.com/middlewarehq/middleware/blob/main/media_files/product_demo_1.gif)

- Setup the project by following the [steps mentioned above](#-quick-start).
- Generate and Add your PAT token from code provider.
- Create a team and select repositories for the team.
- See Dora Metrics for your team.
- Update settings related to incident filters, excluded pull requests, prod branches etc to get more accurate data.

## 📖 How we Calculate Dora Metrics

Middleware can display DORA Metrics using exclusively Pull Requests based data. The aim is to provide Dora Metrics to anyone and everyone using their Git data, regardless of other integrations, in as few steps as possible.

In its totality, Dora Metrics are derived from Pull Requests, Deployments, and Incidents.

To learn more about how it's done, [look at our documentation here](https://middlewarehq.com/docs/product/oss/calculations).

## 🛣️ Roadmap

Coming Soon!

## ❤️ Contributing guidelines

![contributor Metrics](https://open-source-assets.middlewarehq.com/svgs/middlewarehq-middleware-contributor-metrics-dark-widget-premium.svg)

To get started contributing to middleware check out our [CONTRIBUTING.md](https://github.com/middlewarehq/middleware/blob/main/CONTRIBUTING.md).

> [!IMPORTANT]
> ✨ We offer **SWAG** for solving issues labelled [`advanced`](https://github.com/middlewarehq/middleware/issues?q=is%3Aissue+is%3Aopen+label%3Aadvanced)! ✨
> _Please confirm with our team on respective issues before proceeding._

> [!IMPORTANT]
> 👩‍💻 When new hiring positions open, we look at our open source contributors first! 👨‍💻
> _[Join our Slack](https://mhq.link/oss-community) so we can reach out to you._

We appreciate your contributions and look forward to working together to make Middleware even better!

## 👨‍💻 Developer Automations

This sections contains some automation scripts that can generate boilerplate code to extend certain features and ship faster 🚀

### 1. Adding New Settings in Backend

- Context: Initially, adding a new setting required context of the settings system, changes across some files and making adapters and defaults based on the new setting class structure.
- This can now be done by running the `python make_new_setting.py` script in the `./backend/dev_scripts` directory

If you are in the root directory, you can run:
```
python ./backend/dev_scripts/make_new_setting.py
```

- Enter the setting name in the consitent format.
- Add the required keys and their types. Enter `done` once you have added all the fields.
- Update imports and linting.
- You are good to go :tada"
- Note: For more non-primitive types in the setting such as uuid, enums etc, you will have to make changes to the generated adaptors.


https://github.com/middlewarehq/middleware/assets/70485812/f0529fa7-a2cb-44b1-ae07-2a7c97f56bef

# ⛓️ Security guidelines

To get started contributing to middleware check out our [SECURITY.md](https://github.com/middlewarehq/middleware/blob/main/SECURITY.md).

We look forward to your part in keeping Middleware secure!


## License

This project is licensed under the [Apache 2.0](https://github.com/middlewarehq/middleware/blob/main/LICENSE) License - see the LICENSE.md file for details.



![Banner](https://github.com/middlewarehq/middleware/blob/main/media_files/banner.png)
