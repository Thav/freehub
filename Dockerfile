FROM mcr.microsoft.com/vscode/devcontainers/ruby:0-3.2

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