echo "{"registry-mirrors": ["https://func.ink"]}" | sudo tee /etc/docker/daemon.json

echo "try to close all containers..."
docker compose down
echo 'creating containers for mysql redis rabbitmq opensearch...'
docker compose up -d mysql redis rabbitmq opensearch
docker logs mysql # switch to one select: mysql redis rabbitmq opensearch
docker compose up -d maxwell
echo 'it's okay, let's use maven and java'
cd blog && mvn clean install package && cd ..
nohup java -jar blog/target/app.jar >/dev/null 2>&1 &
