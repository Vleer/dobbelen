# Use an official Gradle image to build the application
FROM gradle:jdk21 AS build

WORKDIR /app

# Copy build files
COPY build.gradle settings.gradle ./
COPY src ./src

# Build the application
RUN gradle build --no-daemon

# Use an official OpenJDK runtime as a parent image
FROM openjdk:21-jdk-slim

# Set the working directory
WORKDIR /app

# Copy the jar file from the build stage
COPY --from=build /app/build/libs/*.jar app.jar

# Expose port 48080
EXPOSE 48080

# Run the jar file
ENTRYPOINT ["java", "-jar", "app.jar"]
