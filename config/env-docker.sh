# Need to set your local environment.
export PROJECT_HOME=/app
export PROJECT_NAME=blog
export PROJECT_VERSION=0.0.1

# mvn setting

MVN_SETTINGS_FILE="/root/.m2/settings.xml"
if [ -f "$MVN_SETTINGS_FILE" ]; then
    cp "$MVN_SETTINGS_FILE" "${MVN_SETTINGS_FILE}.bak"
    cp "${PROJECT_HOME}/config/init/m2/settings.xml" "$MVN_SETTINGS_FILE"
else
    mkdir -p "/root/.m2"
    cp "${PROJECT_HOME}/config/init/m2/settings.xml" "$MVN_SETTINGS_FILE"
fi

cd $PROJECT_HOME && mvn install
