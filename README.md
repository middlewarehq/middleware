# dora-metrics
**dora-metrics** is an open-source tool designed to help engineering leaders measure and analyze the productivity of their teams using the DORA (DevOps Research and Assessment) metrics. The DORA metrics are a set of four key values that provide insights into software delivery performance and operational efficiency. They are:

- **Deployment Frequency**: The frequency of code deployments to production or an operational environment.
- **Lead Time for Changes**: The time it takes for a commit to make it into production.
- **Mean Time to Restore**: The time it takes to restore service after an incident or failure.
- **Change Failure Rate**: The percentage of deployments that result in failures or require remediation.

# Quick Start
Open the terminal and run the following command
```bash
docker run -d \
    -p 8000:8000 \
    -p 4000:4000 \
    -v <path_to_postgres_data_directory>:/var/lib/postgresql/data \
    --name dora-metrics \
    public.ecr.aws/middlewarehq/dora-metrics:latest
```
The frontend is available on your host at http://localhost:4000. 

The backend is available on your host at http://localhost:8000.

# Project Setup Guidelines
### Using Docker
1. **Clone the Repository**: 
   ```bash
   git clone https://github.com/your-username/dora-metrics.git
   ```

2. **Navigate to the Project Directory**:
   ```bash
   cd dora-metrics
   ```
3. **Run Docker Compose**
   ```bash
   docker-compose up -d
   ```
   
### Manual Setup
To set up dora-metrics locally, follow these steps:

1. **Clone the Repository**: 
   ```bash
   git clone https://github.com/your-username/dora-metrics.git
   ```

2. **Navigate to the Project Directory**:
   ```bash
   cd dora-metrics
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
   - For backend:
     ```bash
     python main.py
     ```
   - For frontend:
     ```bash
     npm start
     ```

7. **Access the Application**:
   Once the project is running, access the application through your web browser at `http://localhost:8000`.

# Contributing guidelines
To get started contributing to dora-metrics check out our [CONTRIBUTING.md](https://github.com/middlewarehq/dora-metrics/blob/main/CONTRIBUTING.md). 

We appreciate your contributions and look forward to working together to make DORA Metrics even better!
