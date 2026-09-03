pipeline {
    agent any

    environment {
        APP_DIR = '/opt/app/middleware'
        // CLUSTOX: the production compose file, not the default one. See the
        // Build & Deploy stage for why that distinction is the whole point.
        COMPOSE_FILE = 'docker-compose.prod.yml'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Update Deployment Copy') {
            steps {
                sh '''
                    cd ${APP_DIR}
                    git fetch origin main
                    git reset --hard origin/main
                '''
            }
        }

        // CLUSTOX: .env is gitignored, so a release that needs a new variable
        // cannot deliver it. Without this stage the app builds, starts, and
        // then fails at runtime in ways the health check cannot see -- an unset
        // INTERNAL_API_TOKEN makes the Flask servers reject every request, and
        // an unset SUPERADMIN_PASSWORD means no account is ever created.
        //
        // Failing here, before anything is torn down, leaves the running
        // deployment alive through a misconfigured release.
        stage('Verify Environment') {
            steps {
                sh '''
                    cd ${APP_DIR}

                    if [ ! -f .env ]; then
                        echo "FATAL: ${APP_DIR}/.env does not exist."
                        exit 1
                    fi

                    MISSING=""
                    for VAR in NEXTAUTH_URL NEXTAUTH_SECRET INTERNAL_API_TOKEN \
                               SUPERADMIN_EMAIL SUPERADMIN_PASSWORD; do
                        # Present AND non-empty. `grep -q "^VAR="` alone would
                        # pass on a variable set to nothing.
                        if ! grep -qE "^${VAR}=.+" .env; then
                            MISSING="${MISSING} ${VAR}"
                        fi
                    done

                    if [ -n "${MISSING}" ]; then
                        echo "FATAL: required variables missing or empty in ${APP_DIR}/.env:"
                        for VAR in ${MISSING}; do echo "  - ${VAR}"; done
                        echo ""
                        echo "See env.example. Nothing has been changed."
                        exit 1
                    fi

                    echo "All required environment variables are present."
                '''
            }
        }

        stage('SonarQube Analysis') {
            steps {
                // CLUSTOX: placed before Build/Deploy on purpose -- this is a deploy
                // pipeline, so the gate below has to be able to stop a release. It sits
                // after Verify Environment so a missing .env variable still fails fast
                // and cheaply, before spending a scan.
                //
                // The agent has Docker but no sonar-scanner CLI and no SonarQube Scanner
                // tool installation, so the official scanner image is used.
                // sonar.working.directory is redirected into the bind-mounted workspace:
                // the image's baked-in /tmp/.scannerwork is owned by uid 1000 and
                // unwritable under -u, and the override also lands report-task.txt where
                // waitForQualityGate looks for it.
                withSonarQubeEnv('MySonarQube') {
                    sh '''
                      docker run --rm \
                        -u "$(id -u):$(id -g)" \
                        -e SONAR_HOST_URL="$SONAR_HOST_URL" \
                        -e SONAR_TOKEN="$SONAR_AUTH_TOKEN" \
                        -e SONAR_USER_HOME=/tmp/.sonar \
                        -v "$WORKSPACE:/usr/src" \
                        -w /usr/src \
                        sonarsource/sonar-scanner-cli:latest \
                        -Dsonar.working.directory=/usr/src/.scannerwork \
                        -Dsonar.projectVersion="${GIT_COMMIT:-$BUILD_NUMBER}"
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                // CLUSTOX: bounded wait. waitForQualityGate depends on SonarQube calling
                // back to /sonarqube-webhook/; without the timeout a missed webhook would
                // hang this stage until the build is killed, holding the deploy hostage.
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Fetch Sonar Issues') {
            steps {
                // CLUSTOX: reporting only -- catchError keeps a SonarQube outage or an
                // expired token from blocking a deploy that already passed the gate. Uses
                // the read-only token, not the scan credential, and sends it as an
                // Authorization header so it cannot land in proxy or access logs.
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    withCredentials([string(credentialsId: 'sonarqube-readonly-token', variable: 'SONAR_RO_TOKEN')]) {
                        sh '''
                          set -eu
                          PS=500
                          TMP=$(mktemp -d)
                          trap 'rm -rf "$TMP"' EXIT
                          page=1
                          while : ; do
                            curl --fail --silent --show-error \
                              -H "Authorization: Bearer $SONAR_RO_TOKEN" \
                              -o "$TMP/page-$page.json" \
                              "https://sonar.theclustox.com/api/issues/search?componentKeys=middleware&resolved=false&ps=$PS&p=$page"
                            total=$(jq -r '.paging.total' "$TMP/page-$page.json")
                            fetched=$(( page * PS ))
                            echo "fetched page $page (up to $fetched of $total open issues)"
                            [ "$fetched" -ge "$total" ] && break
                            [ "$fetched" -ge 10000 ] && { echo "WARNING: capped at 10000 issues"; break; }
                            page=$(( page + 1 ))
                          done
                          # The warnings-ng SonarQube parser sniffs the response format from
                          # the top-level keys, so the merged document has to look like one
                          # big api/issues/search page -- dropping total/p/ps makes it
                          # silently parse to zero issues.
                          jq -s '
                            (map(.issues) | add)   as $iss |
                            (.[0].paging.total)    as $tot |
                            {
                              total:       $tot,
                              p:           1,
                              ps:          ($iss | length),
                              paging:      {pageIndex: 1, pageSize: ($iss | length), total: $tot},
                              effortTotal: (map(.effortTotal // 0) | add),
                              issues:      $iss,
                              components:  (map(.components // []) | add | unique_by(.key))
                            }' "$TMP"/page-*.json > sonar-issues.json
                          echo "merged $(jq '.issues | length' sonar-issues.json) issues into sonar-issues.json"
                        '''
                    }
                }
            }
        }

        stage('Publish Issue Report') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    recordIssues(tools: [sonarQube(pattern: 'sonar-issues.json')])
                }
            }
        }

        stage('Build') {
            steps {
                // CLUSTOX: builds docker-compose.prod.yml, which uses the
                // production Dockerfile and runs `yarn build`. The default
                // docker-compose.yml is upstream's *local development* file: it
                // builds Dockerfile.dev, which never builds the frontend, so the
                // container serves the app through `next dev` and compiles every
                // route inside the first request that asks for it. Measured on a
                // cold container: /login 7.5s, /workspaces 5.7s, /users 21.8s,
                // against 0.02s once warm.
                //
                // The build is deliberately its own stage. `docker compose build
                // && docker compose up -d` in one step is a trap: when the build
                // fails, `up -d` happily recreates the container from the
                // PREVIOUS image, so a broken release presents as a healthy app
                // serving stale code and the pipeline reports success. That is
                // not hypothetical -- it happened during development when a
                // dependency pin was wrong for the image's Python version.
                sh '''
                    cd ${APP_DIR}
                    docker compose -f ${COMPOSE_FILE} build
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    cd ${APP_DIR}
                    docker compose -f ${COMPOSE_FILE} up -d
                '''
            }
        }

        stage('Health Check') {
            steps {
                // CLUSTOX: the previous check was `sleep 10` then a curl of `/`.
                // Both halves were wrong. `/` answers 307 to /login for a
                // signed-out request and curl treats a redirect as success, so
                // it passed against an app whose API was entirely broken. And
                // 10s is short for a cold start that also runs migrations, so it
                // produced false failures too.
                //
                // Instead: poll until the app answers, then assert the API
                // returns 401. Reaching 401 proves Next.js is serving, the
                // database is reachable, and auth is wired up. A misconfigured
                // instance returns 500 or refuses the connection.
                sh '''
                    PORT_NUM=${PORT:-3333}
                    BASE="http://127.0.0.1:${PORT_NUM}"

                    echo "Waiting for the app to accept connections..."
                    READY=0
                    for i in $(seq 1 60); do
                        if curl -sf -o /dev/null "${BASE}/login"; then
                            READY=1
                            echo "App responded after $((i * 5))s."
                            break
                        fi
                        sleep 5
                    done

                    if [ "${READY}" != "1" ]; then
                        echo "FATAL: app did not respond within 300s."
                        cd ${APP_DIR} && docker compose -f ${COMPOSE_FILE} logs --tail=80
                        exit 1
                    fi

                    echo "Checking that the API is up and enforcing auth..."
                    CODE=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/api/clustox/me")
                    if [ "${CODE}" != "401" ]; then
                        echo "FATAL: /api/clustox/me returned ${CODE}, expected 401."
                        echo "The app is serving pages but the API is not healthy."
                        cd ${APP_DIR} && docker compose -f ${COMPOSE_FILE} logs --tail=80
                        exit 1
                    fi

                    echo "Health check passed."
                '''
            }
        }

        // CLUSTOX: proves the deploy is actually serving a compiled bundle
        // rather than silently falling back to the dev server. A production
        // build answers a cold page request in well under a second; `next dev`
        // takes seconds to tens of seconds because it compiles on demand.
        //
        // This is a warning rather than a failure: a slow disk or a loaded host
        // could trip it without the deploy being wrong, and failing a healthy
        // release over a timing measurement would be worse than the problem.
        stage('Verify Production Build') {
            steps {
                sh '''
                    BASE="http://127.0.0.1:${PORT:-3333}"

                    ELAPSED=$(curl -s -o /dev/null -w '%{time_total}' "${BASE}/login")
                    echo "Cold /login response: ${ELAPSED}s"

                    # Integer compare; `sh` has no float arithmetic.
                    WHOLE=$(echo "${ELAPSED}" | cut -d. -f1)
                    if [ "${WHOLE}" -ge 3 ]; then
                        echo "WARNING: ${ELAPSED}s is slow for a compiled build."
                        echo "The container may be running 'next dev' -- check that"
                        echo "ENVIRONMENT=prod reached it and that ${COMPOSE_FILE} was used."
                    else
                        echo "Response time is consistent with a production build."
                    fi
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
