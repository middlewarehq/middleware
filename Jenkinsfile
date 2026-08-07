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
            withCredentials([string(credentialsId: 'slack-webhook-ci-build-alerts', variable: 'SLACK_WEBHOOK_URL')]) {
                sh '''
                    curl -X POST -H "Content-type: application/json" \
                    --data "{\\"text\\":\\"✅ *middleware* deployment succeeded — build #${BUILD_NUMBER} — ${BUILD_URL}\\"}" \
                    "$SLACK_WEBHOOK_URL"
                '''
            }
        }
        failure {
            echo 'Deployment failed - check console output.'
            withCredentials([string(credentialsId: 'slack-webhook-ci-build-alerts', variable: 'SLACK_WEBHOOK_URL')]) {
                sh '''
                    curl -X POST -H "Content-type: application/json" \
                    --data "{\\"text\\":\\"❌ *middleware* deployment failed — build #${BUILD_NUMBER} — ${BUILD_URL}\\"}" \
                    "$SLACK_WEBHOOK_URL"
                '''
            }
        }
    }
}