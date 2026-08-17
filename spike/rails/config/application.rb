require_relative "boot"
require "rails/all"
Bundler.require(*Rails.groups)
module FreehubRailsSpike
  class Application < Rails::Application
    config.load_defaults 8.1
    config.autoload_lib(ignore: %w[assets tasks])
    config.secret_key_base = ENV.fetch("SECRET_KEY_BASE", "local-spike-secret-key-base-must-not-be-used-in-production")
  end
end
