# ---------- build stage ----------
FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /build

COPY pom.xml ./
COPY xxl-job-core ./xxl-job-core
COPY xxl-job-admin ./xxl-job-admin

RUN mvn -B -DskipTests clean package

# ---------- runtime stage ----------
FROM eclipse-temurin:17-jre-alpine

MAINTAINER xuxueli

ENV PARAMS=""
ENV TZ=Asia/Shanghai

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY --from=builder /build/xxl-job-admin/target/xxl-job-admin-*.jar /app.jar

EXPOSE 8080

ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app.jar $PARAMS"]
