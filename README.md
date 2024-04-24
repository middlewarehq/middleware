# Middleware

![Product Demo](media_files/product_demo_1.gif)

**Middleware** is an open-source tool designed to help engineering leaders measure and analyze the effectiveness of their teams using the DORA (DevOps Research and Assessment) metrics. The DORA metrics are a set of four key values that provide insights into software delivery performance and operational efficiency. They are:

- **Deployment Frequency**: The frequency of code deployments to production or an operational environment.
- **Lead Time for Changes**: The time it takes for a commit to make it into production.
- **Mean Time to Restore**: The time it takes to restore service after an incident or failure.
- **Change Failure Rate**: The percentage of deployments that result in failures or require remediation.


**Table of Contents**
- [Middleware - Open Source](#middleware)
  - [Quick Start](#quick-start)
  - [Project Setup Guidelines](#project-setup-guidelines)
    - [Using Docker](#using-docker)
    - [Manual Setup](#manual-setup)
  - [Contributing guidelines](#contributing-guidelines)
  - [Security guidelines and disclosure](#security-guidelines-and-disclosure)
  - [Features](#features)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Examples](#examples)
  - [Contributing](#contributing)
  - [License](#license)

## Features
- Integration with various CI/CD tools
- Automated collection and analysis of DORA metrics
- Visualization of key performance indicators
- Customizable reports and dashboards
- Integration with popular project management platforms

## Quick Start
Open the terminal and run the following command
```bash
docker run \
    --name middleware \
    -p 3000:3333 \
    public.ecr.aws/y4x5l0o7/middleware:latest
```

Wait for sometime for the services to be up.

The App shall be available on your host at http://localhost:3333. 

## Project Setup Guidelines
### Using Docker
1. **Clone the Repository**: 
   ```bash
   git clone https://github.com/middlewarehq/middleware
   ```

2. **Navigate to the Project Directory**:
   ```bash
   cd middleware
   ```

3. **Set Environment variables**\
    Make `.env` file in the project root directory and put environment variables for frontend and backend in it.\
    You can also specify which individual services to enable if you don't want to start all the services.
    ```
    # .env file

    DB_HOST=localhost
    DB_NAME=dora
    DB_PASS=postgres
    DB_PORT=5432
    DB_USER=postgres
    REDIS_HOST=localhost
    REDIS_PORT=6379
    ENVIRONMENT=dev

    # Enable/Disable individual services
    POSTGRES_DB_ENABLED=true
    DB_INIT_ENABLED=true
    REDIS_ENABLED=true
    BACKEND_ENABLED=true
    FRONTEND_ENABLED=true
    CRON_ENABLED=true

    NEXT_PUBLIC_APP_ENVIRONMENT="development"
    INTERNAL_API_BASE_URL=http://localhost:9696

    # For using db on host machine uncomment the following. Useful when using ssh tunnelling.
    #DB_HOST=host.docker.internal
    #DB_PORT=5433
    ```
    Set `ENVIRONMENT=prod` to run it in production setup.\
    Setting `DB_HOST` as `host.docker.internal` will help when you want to connect to a db instance which
    is running on your host machine. Also update `DB_PORT` accordingly.


4. **Run `dev.sh` script in the project root**\
    `./dev.sh` can be run with either no arguments or all arguments need to provided for creating the ssh tunnel.\
    The usage is as follows:
    ```bash
    Usage: ./dev.sh [-i identity_file] [-l local_port] [-r remote_host] [-p remote_port] [-u ssh_user] [-h ssh_host]
    ```
    ```bash
    # runs without the ssh tunnel
    ./dev.sh     
    ```
    ```bash
    # runs with the ssh tunnel
   ./dev.sh  -i /path/to/private_key -l 5433 -r mhq_db.rds.amazonaws.com -p 5432 -u ec2-user -h 255.96.240.666
    ```
   
### Manual Setup
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
     npm install
     ```

4. **Build the Project**:
   - For frontend:
     ```bash
     npm run build
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
     npm start
     ```

7. **Access the Application**:
   Once the project is running, access the application through your web browser at http://localhost:8000. Additionally:
   * The analytics server is available at http://localhost:5000.
   * The sync server can be accessed at http://localhost:6000.


## Contributing
To get started contributing to middleware check out our [CONTRIBUTING.md](https://github.com/middlewarehq/middleware/blob/main/CONTRIBUTING.md). 

We appreciate your contributions and look forward to working together to make Middleware even better!

## Security guidelines and disclosure
To get started contributing to middleware check out our [SECURITY.md](https://github.com/middlewarehq/middleware/blob/main/SECURITY.md). 

We look forward to your part in keeping Middleware secure!

## Usage
- Instructions for using the DORA metrics analyzer
- How to configure data sources and metrics collection
- Generating and interpreting reports
- Tips for optimizing DevOps performance based on insights

## Examples
- Sample reports and dashboards showcasing DORA metrics
- Real-world use cases and success stories
- Screenshots of the analyzer in action

## License
- Information about the project's license (e.g., MIT, Apache 2.0)
- Link to the full license text
- Any additional terms or conditions related to licensing

## License
- Information about the project's license (e.g., MIT, Apache 2.0)
- Link to the full license text
- Any additional terms or conditions related to licensing

![Product Screenshot](link_to_screenshot)



