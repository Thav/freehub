FROM mcr.microsoft.com/vscode/devcontainers/ruby:0-3.2

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs

# Install Bundler
RUN gem install bundler:2.4.2

# Install Rails
RUN gem install rails

# Set up working directory
WORKDIR /workspace

# Copy Gemfile and Gemfile.lock
COPY Gemfile Gemfile.lock ./

# Install gems
RUN bundle install

# Copy the rest of the application code
COPY . .

# Expose port 3000
EXPOSE 3000
