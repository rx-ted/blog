# 使用 Maven 官方镜像作为基础镜像
FROM maven:3.8.7 AS build

# 设置工作目录
WORKDIR /app

# 将项目的源代码复制到容器中
COPY . .
COPY ./config/init/m2/settings.xml /root/.m2/settings.xml

# 使用 Maven 构建项目
RUN mvn clean
RUN install
RUN package

# 产物 target/app.jar 和 target/app.xml

# 创建一个新的阶段来运行应用
FROM openjdk:17-jdk AS run

# 设置工作目录
WORKDIR /app

# 从构建阶段复制产物到运行阶段
COPY --from=build /app/target/app.jar .
# 如果 app.xml 是必要的，并且是由 Maven 生成的，也复制它
# COPY --from=build /app/target/app.xml .

# 暴露端口
EXPOSE 8080
EXPOSE 25

# 运行应用
# 注意：这里假设你的应用是一个 Spring Boot 应用或其他可以通过 java -jar 运行的 JAR
CMD ["java", "-jar", "app.jar"]