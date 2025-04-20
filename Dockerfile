# This file is not currently in use - it was being used for dev
# containers but it was found that that was not needed. Maybe
# this comes back for production.
FROM ruby:3.2.2

# FROM mcr.microsoft.com/vscode/devcontainers/ruby:0-3.2
# FROM ghcr.io/rails/devcontainer/images/ruby:3.2.2

# Set user
# USER vscode

# # Install Bundler
# RUN gem install bundler

# # Install Rails
# RUN gem install rails

# Set up working directory
# WORKDIR /workspace

# Copy Gemfile and Gemfile.lock
# COPY Gemfile Gemfile.lock ./

# Install gems
# RUN bundle install --with development

# Copy the rest of the application code
# COPY . .

# Expose port 3000
# EXPOSE 3000