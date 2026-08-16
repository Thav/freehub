FROM ruby:2.1.10@sha256:568664cfb53cd74147590cc86e356c4e352e00e28a0011ea1443e8664ca5bad5 AS legacy_generator

FROM ruby:2.7.8-bullseye@sha256:2347de892e419c7160fc21dec721d5952736909f8c3fbb7f84cb4a07aaf9ce7d

ARG RUBY_VERSION=1.9.3-p551
ARG BUNDLER_VERSION=1.13.1
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

COPY ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=legacy_generator /usr/local /usr/local

RUN sed -i 's|http://|https://|g' /etc/apt/sources.list \
 && apt-get \
      -o "Acquire::http::Proxy=${HTTP_PROXY}" \
      -o "Acquire::https::Proxy=${HTTPS_PROXY}" \
      update \
 && apt-get install -y --no-install-recommends \
      build-essential \
      libmariadb-dev-compat \
      libreadline-dev \
      zlib1g-dev \
 && rm -rf /var/lib/apt/lists/*

COPY --from=legacy_generator /usr/include/mysql /usr/include/mysql
COPY --from=legacy_generator /usr/lib/x86_64-linux-gnu/libmysqlclient.* /usr/lib/x86_64-linux-gnu/
COPY --from=legacy_generator /usr/bin/mysql_config /usr/bin/mysql_config

RUN git clone --depth 1 --branch OpenSSL_1_0_2u https://github.com/openssl/openssl.git openssl-1.0.2u \
 && cd openssl-1.0.2u \
 && test "$(git rev-parse HEAD)" = "e818b74be2170fbe957a07b0da4401c2b694b3b8" \
 && ./config --prefix=/opt/openssl-1.0.2u --openssldir=/opt/openssl-1.0.2u shared \
 && make -j"$(nproc)" \
 && make install_sw \
 && cd / \
 && rm -rf /openssl-1.0.2u

ENV LD_LIBRARY_PATH=/opt/openssl-1.0.2u/lib
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

RUN git clone --depth 1 --branch v1_9_3_551 https://github.com/ruby/ruby.git "ruby-${RUBY_VERSION}" \
 && cd "ruby-${RUBY_VERSION}" \
 && curl --fail --show-error --location --proxy "${HTTPS_PROXY}" \
      --output parse.c \
      "https://sources.debian.org/data/main/r/ruby1.9.1/1.9.3.194-8.1%2Bdeb7u2/parse.c" \
 && curl --fail --show-error --location --proxy "${HTTPS_PROXY}" \
      --output parse.h \
      "https://sources.debian.org/data/main/r/ruby1.9.1/1.9.3.194-8.1%2Bdeb7u2/parse.h" \
 && echo "0a84f8e01ecc54ada3ea62d61f676e4ce8ea20b76df117f18921944c6f056a7c  parse.c" | sha256sum -c - \
 && echo "b3396afbcf271453e0d162dd8179b3a1b659140ffd1b3c48f1db9fe1d928b594  parse.h" | sha256sum -c - \
 && autoconf \
 && ./configure --disable-install-doc --with-openssl-dir=/opt/openssl-1.0.2u \
 && make \
 && make install \
 && cd / \
 && rm -rf "/ruby-${RUBY_VERSION}"

RUN curl --fail --show-error --location --proxy "$HTTPS_PROXY" \
      --output "bundler-${BUNDLER_VERSION}.gem" \
      "https://rubygems.org/downloads/bundler-${BUNDLER_VERSION}.gem" \
 && echo "cf1f6203db06531c7086d3fa3ca8c8e579b2cdd003dd7f4f5063607ef692eb09  bundler-${BUNDLER_VERSION}.gem" | sha256sum -c - \
 && gem install --local --no-rdoc --no-ri "bundler-${BUNDLER_VERSION}.gem" \
 && rm "bundler-${BUNDLER_VERSION}.gem"

WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN http_proxy="$HTTP_PROXY" https_proxy="$HTTPS_PROXY" \
    bundle _1.13.1_ install --deployment --without development test

COPY . .
RUN test -s public/javascripts/jquery-1.4.2.js

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bundle", "_1.13.1_", "exec", "ruby", "-I.", "script/server", "webrick", "-e", "development", "-b", "0.0.0.0", "-p", "3000"]
