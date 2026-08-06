pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Update Deployment Copy') {
            steps {
                sh '''
                    cd /opt/app/middleware
                    git fetch origin main
                    git reset --hard origin/main
                '''
            }
        }

        stage('Build & Deploy') {
            steps {
                sh '''
                    cd /opt/app/middleware
                    docker compose build
                    docker compose up -d
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    sleep 10
                    curl -sf http://127.0.0.1:${PORT:-3333} || (echo "Health check failed" && exit 1)
                '''
            }
        }
    }

    post {
        success {
            echo 'Deployment succeeded.'
        }
        failure {
            echo 'Deployment failed - check console output.'
        }
    }
}

