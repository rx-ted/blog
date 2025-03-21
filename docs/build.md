# environment build

- mysql
- redis
- elasticsearch
- nginx
- zendesk/maxwell
- rabbitMQ
- maven
- java-openjdk
- vscode or vim idea
- docker

## mysql

## elasticsearch

```shell
mkdir -p /home/elasticsearch/data
mkdir -p /home/elasticsearch/plugins
chmod -R 777 /home/elasticsearch/

docker run --name elasticsearch8 -p 9200:9200 \
    -p 9300:9300 \
    -e "discovery.type=single-node" \
    -e ES_JAVA_OPTS="-Xms64m -Xmx128m" \
     -v ./config/init/elasticsearch/elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml \
    -v /home/elasticsearch/data:/usr/share/elasticsearch/data \
    -v /home/elasticsearch/plugins:/usr/share/elasticsearch/plugins \
    -d elasticsearch:8.17.3
```
