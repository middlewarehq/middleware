<br /><br />
<p align="center">
<a href="https://www.middlewarehq.com/">
  <img src="media_files/logo.png" alt="Middleware Logo" width=300px>
</a>
</p>

<p align="center"><b>Open-source engineering management that unlocks developer potential.</b></p>

<p align="center">
<a href="https://github.com/middlewarehq/middleware/actions/workflows/build.yml">
    <img alt="continuous integration" src="https://img.shields.io/github/actions/workflow/status/middlewarehq/middleware/build.yml?branch=main&label=build&style=for-the-badge">
</a>
<a href="https://github.com/middlewarehq/middleware/graphs/commit-activity">
    <img alt="Commit activity per month" src="https://img.shields.io/github/commit-activity/m/middlewarehq/middleware?style=for-the-badge" />
</a>
<a href="https://github.com/middlewarehq/middleware/graphs/contributors">
    <img alt="contributors" src="https://img.shields.io/github/contributors-anon/middlewarehq/middleware?color=yellow&style=for-the-badge" />
  </a>
<br/>
<a href="https://opensource.org/licenses/Apache-2.0">
    <img src="https://img.shields.io/badge/apache%202.0-purple.svg?style=for-the-badge&label=license" alt="license" />
</a>
<img src="https://img.shields.io/github/stars/middlewarehq/middleware?style=for-the-badge" alt="Stars" />

</p>

![Banner](media_files/banner.png)


## Introduction
**Middleware** is an open-source tool designed to help engineering leaders measure and analyze the effectiveness of their teams using the DORA (DevOps Research and Assessment) metrics. The DORA metrics are a set of four key values that provide insights into software delivery performance and operational efficiency. They are:

- **Deployment Frequency**: The frequency of code deployments to production or an operational environment.
- **Lead Time for Changes**: The time it takes for a commit to make it into production.
- **Mean Time to Restore**: The time it takes to restore service after an incident or failure.
- **Change Failure Rate**: The percentage of deployments that result in failures or require remediation.

**Table of Contents**

- [Middleware - Open Source](#introduction)
  - [Features](#-features)
  - [Quick Start](#-quick-start)
  - [Developer Setup](#-developer-setup)
    - [Using Docker](#-using-docker)
    - [Manual Setup](#%EF%B8%8F-manual-setup)
  - [Contributing guidelines](https://github.com/middlewarehq/middleware/blob/main/CONTRIBUTING.md)
  - [Security guidelines and disclosure](#security-guidelines-and-disclosure)
  - [Usage](#-usage)
  - [Examples](#examples)
  - [Contributing](#%EF%B8%8F-contributing)
  - [License](#license)

## 🚀 Features

- Integration with various CI/CD tools
- Automated collection and analysis of DORA metrics
- Visualization of key performance indicators
- Customizable reports and dashboards
- Integration with popular project management platforms

## ✨ Quick Start

Open the terminal and run the following command

```bash
docker run \
    --name middleware \
    -p 3333:3333 \
    -d \
    middlewareeng/middleware:latest
    
```

Wait for sometime for the services to be up.

The app shall be available on your host at http://localhost:3333.

In case you want to stop the container, run the following command:

```bash
docker stop middleware
```


## 👩‍💻 Developer Setup

### 🐳 Using Docker

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
    `./dev.sh` creates a `.env` file with required development environments and run container with `docker compose watch`.\
    The usage is as follows:
   ```bash
   # runs without the ssh tunnel
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

5. **View the logs**: The logs of services running inside the container can be viewed using the following
   commands: 
     
   **frontend logs**
   ```bash
    docker exec -it middleware-dev tail --lines 500 -f /var/log/web-server/web-server.log
   ```
   **backend logs**
   ```bash
    docker exec -it middleware-dev tail --lines 500 -f /var/log/apiserver/apiserver.log
   ```
   **redis logs**
   ```bash
    docker exec -it middleware-dev tail --lines 500 -f /var/log/redis/redis.log
   ```
   **postgres logs**
   ```bash
    docker exec -it middleware-dev tail --lines 500 -f /var/log/postgres/postgres.log
   ```


### 🛠️ Manual Setup

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

   ```
   cd database-docker/
   docker-compose down -v
   ```


5. **Backend Server Setup**

    Install python version `3.11.6`
    
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

     - Create a `.env.local` file in the `/backend` directory and add the following environment variables, replacing the values with your own if needed:

     ```
       DB_HOST=localhost
       DB_NAME=mhq-oss
       DB_PASS=postgres
       DB_PORT=5434
       DB_USER=postgres
       REDIS_HOST=localhost
       REDIS_PORT=6385
       ANALYTICS_SERVER_PORT=9696
       SYNC_SERVER_PORT=9697
     ```

    - Switch to analytics_server directory
  
    ```
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

      NOTE: Open this sync sever in a new terminal window after activating the virtual environment if you are already using analytics server. 

6. **Web Server Setup**

   - Install NodeJs 16.17 (LTS) either [manually](https://nodejs.org/en/download) or using a tool like [nvm](https://github.com/nvm-sh/nvm) or [volta](https://volta.sh/).

   - Install `yarn` package manager
   ```
   npm install --global yarn
   ```
   - Change Directory to web-server and install packages
   ```
   cd web-server
   yarn
   ```
   
   - Start the web-server
   ```
   yarn dev
   ```
    

7. **Access the Application**:
   Once the project is running, access the application through your web browser at http://localhost:3333. \
   Additionally:
   - The analytics server is available at http://localhost:9696.
   - The sync server can be accessed at http://localhost:9697.


## 🚀 Usage

![Product Demo](media_files/product_demo_1.gif)

- Setup the project by following the [steps mentioned above](#quick-start).
- Generate and Add your PAT token from code provider.
- Create a team and select repositories for the team.
- See Dora Metrics for your team.
- Update settings related to incident filters, excluded pull requests, prod branches etc to get more accurate data.


## ❤️ Contributing

![contributor Metrics](https://open-source-assets.middlewarehq.com/svgs/middlewarehq-middleware-contributor-metrics-dark-widget-premium.svg)

To get started contributing to middleware check out our [CONTRIBUTING.md](https://github.com/middlewarehq/middleware/blob/main/CONTRIBUTING.md).

We appreciate your contributions and look forward to working together to make Middleware even better!

## Security guidelines and disclosure

To get started contributing to middleware check out our [SECURITY.md](https://github.com/middlewarehq/middleware/blob/main/SECURITY.md).

We look forward to your part in keeping Middleware secure!


## Examples 

- Sample reports and dashboards showcasing DORA metrics
- Real-world use cases and success stories
- Screenshots of the analyzer in action

## ⛓️ Security guidelines and disclosure

To get started contributing to middleware check out our [SECURITY.md](https://github.com/middlewarehq/middleware/blob/main/SECURITY.md).

We look forward to your part in keeping Middleware secure!


## License

 
 This project is licensed under the [Apache 2.0](https://github.com/middlewarehq/middleware/blob/main/LICENSE) License - see the LICENSE.md file for details.



![Banner](media_files/banner.png)
