# syntax=docker/dockerfile:1.7
# =============================================================================
# XXL-JOB 多阶段构建（执行器无关：CI 里只需 docker build，无需宿主机 JDK/Maven）
# 构建：docker build -t xxl-job:latest .
# 该 Dockerfile 是唯一构建入口，产物镜像名为 xxl-job:latest
# =============================================================================

# ---------------------------------------------------------------- 构建阶段 ----
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /workspace

# 先拷 pom，利用层缓存预热依赖（源码变动不会导致重新拉依赖）
COPY pom.xml ./
COPY xxl-job-core/pom.xml xxl-job-core/pom.xml
COPY xxl-job-admin/pom.xml xxl-job-admin/pom.xml
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -N -q -DskipTests dependency:go-offline || true

# 再拷源码编译
COPY xxl-job-core/src xxl-job-core/src
COPY xxl-job-admin/src xxl-job-admin/src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -U -DskipTests clean package

# ---------------------------------------------------------------- 运行阶段 ----
FROM eclipse-temurin:21-jre-jammy

MAINTAINER xuxueli

# 默认使用 prod profile（数据库等配置见 application-prod.yml + DB_* 环境变量）
ENV PARAMS="--spring.profiles.active=prod"

# 时区
ENV TZ=PRC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY --from=builder /workspace/xxl-job-admin/target/xxl-job-admin-*.jar /app.jar

EXPOSE 8080

# log home: -e LOG_HOME=/data/applogs
# jvm options: -e JAVA_OPTS="-Xms128m -Xmx128m"
# app params: -e PARAMS="--server.port=8080"
ENTRYPOINT ["sh","-c","java ${LOG_HOME:+-DLOG_HOME=$LOG_HOME} -jar $JAVA_OPTS /app.jar $PARAMS"]
