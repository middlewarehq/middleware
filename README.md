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
  - [Features](#features)
  - [Quick Start](#quick-start)
  - [Project Setup Guidelines](#project-setup-guidelines)
    - [Using Docker](#using-docker)
    - [Manual Setup](#manual-setup)
  - [Contributing guidelines](#contributing-guidelines)
  - [Security guidelines and disclosure](#security-guidelines-and-disclosure)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Examples](#examples)
  - [Contributing](#contributing)
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
    -p 3000:3333 \
    -d \
    middlewareeng/middleware:latest
    
```

Wait for sometime for the services to be up.

The app shall be available on your host at http://localhost:3333.

In case you want to stop the container, run the following command:

```bash
docker stop middleware
```


## 👩‍💻 Run Locally

### 🐳 Using Docker

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/middlewarehq/middleware
   ```

2. **Navigate to the Project Directory**:

   ```bash
   cd middleware
   ```

3. **Run `dev.sh` script in the project root 🪄**\
    `./dev.sh` can be run with either no arguments or all arguments need to provided for creating the ssh tunnel.\
    The usage is as follows:
   ```bash
   # runs without the ssh tunnel
   ./dev.sh
   ```
   You may update the env.example and set `ENVIRONMENT=prod` to run it in production setup.\
   Further if any changes are required to be made to ports, you may update the `docker-compose.yml` file, accordingly.
4. **Access the Application**:
   Once the project is running, access the application through your web browser at http://localhost:3333.
   Further, other services can be accessed at:
    - The analytics server is available at http://localhost:9696.
    - The sync server can be accessed at http://localhost:9697.
    - The postgres database can be accessed at host:localhost, port:5434, username: postgres, password: postgres, db name: mhq-oss.
    - The redis server can be accessed at host:localhost, port:6385.


### 💻 Manual Setup

To set up middleware locally, follow these steps:

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/middlewarehq/middleware.git
   ```

2. **Navigate to the Project Directory**:

   ```bash
   cd middleware
   ```

3. **Install Dependencies**:

   - For backend:
     ```bash
     pip install -r requirements.txt
     ```
   - For frontend:
     ```bash
     yarn install
     ```

4. **Build the Project**:

   - For frontend:
     ```bash
     yarn build
     ```

5. **Run the Project**:

   - For backend analytics server:
     ```bash
     python app.py
     ```
   - For backend sync server:
     ```bash
     python sync_app.py
     ```
   - For frontend:
     ```bash
     yarn http
     ```

6. **Access the Application**:
   Once the project is running, access the application through your web browser at http://localhost:8000. \
   Additionally:
   - The analytics server is available at http://localhost:5000.
   - The sync server can be accessed at http://localhost:6000.


## 📈 Usage

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
