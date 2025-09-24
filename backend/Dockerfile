# Use OpenJDK 17 as base image (supports ARM64 for Raspberry Pi)
FROM eclipse-temurin:17-jdk-jammy

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy gradle wrapper and build files
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# Make gradlew executable
RUN chmod +x gradlew

# Copy source code
COPY src src

# Build the application with reduced memory usage for Raspberry Pi
ENV GRADLE_OPTS="-Xmx512m -XX:MaxMetaspaceSize=256m"
RUN ./gradlew build -x test --no-daemon --parallel --max-workers=1

# Expose port 8080
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run the application
CMD ["java", "-jar", "build/libs/backend-0.0.1-SNAPSHOT.jar"]
