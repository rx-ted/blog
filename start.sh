echo "{"registry-mirrors": ["https://func.ink"]}" | sudo tee /etc/docker/daemon.json

docker-compose up -d --build --exit-code-from
