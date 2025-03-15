# Need to set your local environment.
export PROJECT_HOME=/home/rx-ted/projects/java/blog
export PROJECT_NAME=blog
export PROJECT_VERSION=0.0.1

JAR_BUILD_FILE_NAME="$PROJECT_NAME-$PROJECT_VERSION.jar"
JAR_BUILD_PATH="$PROJECT_HOME/target/$JAR_BUILD_FILE_NAME"
BUILD_NAME="/app/target/$JAR_BUILD_FILE_NAME"
CONTAINER_NAME="blog" # 容器名称或ID
WAIT_TIME=10          # 等待时间（秒）
MAX_ATTEMPTS=60       # 最大尝试次数
attempt=1

mkdir -p "$PROJECT_HOME/target"

build_and_run_container() {
    cleanup
    docker build --network=host . -t $CONTAINER_NAME
    docker run --name $CONTAINER_NAME -d --net host $CONTAINER_NAME
    waitForBuildCompletion
    if [ $? -eq 1 ]; then
        echo "Error: Build did not complete successfully."
        return 1
    fi
    echo "Copying build file from container to host..."
    docker cp $CONTAINER_NAME:$BUILD_NAME $JAR_BUILD_PATH
    if [ ! -f "$JAR_BUILD_PATH" ]; then
        return 1
    fi
    return 0
}

waitForBuildCompletion() {
    while [ $attempt -le $MAX_ATTEMPTS ]; do
        # Check if the logs contain the BUILD_NAME
        if docker logs "$CONTAINER_NAME" | grep -q "$BUILD_NAME"; then
            echo "'$BUILD_NAME' has been successfully built"
            return 0
        fi
        # If not found, wait for a while before retrying
        echo "Waiting $WAIT_TIME seconds before retrying (attempt $attempt/$MAX_ATTEMPTS)..."
        sleep "$WAIT_TIME"
        attempt=$((attempt + 1))
    done
    # If the maximum number of attempts is reached and the BUILD_NAME is still not found, exit with a non-zero status
    echo "'$BUILD_NAME' has not been successfully built."
    return 1
}

cleanup() {
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
    docker rmi $CONTAINER_NAME
}

if [ ! -f "$JAR_BUILD_PATH" ]; then
    build_and_run_container
fi

if [ $? -eq 0 ]; then
    docker-compose up -d
else
    echo "Failed to find $JAR_BUILD_PATH"
fi
