FROM mcr.microsoft.com/vscode/devcontainers/ruby:0-3.2

# Accept the Node.js version argument
ARG NODE_VERSION=20
ENV NODE_VERSION=${NODE_VERSION}
# This tells the base image's scripts to install Node.js

# Install Bundler
RUN gem install bundler

# Install Rails
RUN gem install rails

# Set up working directory
WORKDIR /workspace

# Copy Gemfile and Gemfile.lock
COPY Gemfile Gemfile.lock ./

# Install gems
RUN bundle install --with development

# Copy the rest of the application code
COPY . .

# Expose port 3000
EXPOSE 3000