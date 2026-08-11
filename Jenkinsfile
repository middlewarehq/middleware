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

        // CLUSTOX: the container serves the app through `next dev`, which
        // compiles each route the first time it is requested -- inside the
        // user's request, not at boot. Measured on a cold container: /login
        // 7.5s, /workspaces 5.7s, /users 21.8s, against 0.02s once warm.
        //
        // Warming has to be authenticated. middleware.ts redirects
        // unauthenticated page requests to /login BEFORE Next renders, so an
        // anonymous request returns 307 in ~37ms and compiles nothing --
        // verified by checking .next/server/pages afterwards. A loop without a
        // session warms /login and nothing else.
        //
        // This is a workaround, not a fix. The compile cache lives in memory,
        // so it is lost on restart and can be evicted under memory pressure.
        // The real fix is building the production image, which runs
        // `yarn build` and serves a compiled bundle -- tracked separately.
        stage('Warm Routes') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'middleware-warmup-account',
                    usernameVariable: 'WARM_EMAIL',
                    passwordVariable: 'WARM_PASSWORD'
                )]) {
                    sh '''
                        BASE="http://127.0.0.1:${PORT:-3333}"
                        JAR=$(mktemp)
                        trap 'rm -f "$JAR"' EXIT

                        CSRF=$(curl -s -c "$JAR" "${BASE}/api/auth/csrf" \
                               | sed -n 's/.*"csrfToken":"\\([^"]*\\)".*/\\1/p')

                        if [ -z "$CSRF" ]; then
                            echo "Could not obtain a CSRF token; skipping warm-up."
                            exit 0
                        fi

                        curl -s -b "$JAR" -c "$JAR" -o /dev/null \
                            -X POST "${BASE}/api/auth/callback/credentials" \
                            --data-urlencode "csrfToken=${CSRF}" \
                            --data-urlencode "email=${WARM_EMAIL}" \
                            --data-urlencode "password=${WARM_PASSWORD}" \
                            --data-urlencode "json=true"

                        # A 200 here means the session took and the page really
                        # compiled. A 307 means we are still anonymous, so the
                        # warm-up is not doing anything and should be noisy
                        # about it rather than reporting false success.
                        WARMED=0
                        for ROUTE in /dora-metrics /teams /integrations \
                                     /settings /users /workspaces /collaborate; do
                            CODE=$(curl -s -b "$JAR" -o /dev/null \
                                   -w '%{http_code}' --max-time 180 "${BASE}${ROUTE}")
                            echo "warmed ${ROUTE} -> ${CODE}"
                            [ "$CODE" = "200" ] && WARMED=$((WARMED + 1))
                        done

                        if [ "$WARMED" -eq 0 ]; then
                            echo "WARNING: no route compiled -- check the warm-up credentials."
                        else
                            echo "Route warm-up complete (${WARMED} compiled)."
                        fi
                    '''
                }
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