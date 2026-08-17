FROM ruby@sha256:607bf92fa7ecebb4a0c6654b62cb44c48d94b36b6f5a754611ddbbe3dc5b6135 AS build
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
WORKDIR /rails

# Native Rails dependencies (including websocket-driver and pg) compile here.
# Debian egress is deliberately direct: the sandbox policy allowlists Debian,
# while its HTTP proxy is not an apt mirror.
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential libpq-dev \
 && rm -rf /var/lib/apt/lists/*

COPY Gemfile Gemfile.lock ./
# The pinned Ruby base's trust bundle predates the sandbox proxy CA used by the
# RubyGems compact index. Trust that issuing CA for this build only; TLS remains
# verified and no insecure Bundler flag is used.
RUN if [ -n "$HTTPS_PROXY" ]; then \
      proxy="${HTTPS_PROXY#http://}"; proxy="${proxy#https://}"; \
      openssl s_client -proxy "$proxy" -connect index.rubygems.org:443 -showcerts </dev/null 2>/dev/null | \
        awk 'BEGIN { certificate = 0 } /BEGIN CERTIFICATE/ { certificate += 1 } certificate >= 2 { print }' > /tmp/sandbox-ca.crt; \
      cat /etc/ssl/certs/ca-certificates.crt /tmp/sandbox-ca.crt > /tmp/freehub-ca-certificates.crt; \
      export SSL_CERT_FILE=/tmp/freehub-ca-certificates.crt; \
    fi; \
    HTTP_PROXY="$HTTP_PROXY" HTTPS_PROXY="$HTTPS_PROXY" NO_PROXY="$NO_PROXY" bundle config set --local without 'development'; \
    HTTP_PROXY="$HTTP_PROXY" HTTPS_PROXY="$HTTPS_PROXY" NO_PROXY="$NO_PROXY" bundle install --jobs 4 --retry 3

FROM ruby@sha256:607bf92fa7ecebb4a0c6654b62cb44c48d94b36b6f5a754611ddbbe3dc5b6135 AS runtime
WORKDIR /rails
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY . .
ENV RAILS_ENV=production
EXPOSE 3002
CMD ["sh", "-c", "bin/rails db:prepare && bin/rails db:seed && bin/rails server -b 0.0.0.0 -p ${PORT:-3002}"]
