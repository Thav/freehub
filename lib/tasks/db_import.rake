require 'mysql2'

namespace :db do
  desc "Import SQL dump into development database using mysql2 gem"
  task :import_dump, [:dump_path] => :environment do |t, args|
    dump_file = args[:dump_path] || ENV['DB_DUMP']
    unless dump_file && File.exist?(dump_file)
      puts "Usage: rake db:import_dump[PATH_TO_DUMP] or set ENV['DB_DUMP']"
      exit 1
    end

    config = ActiveRecord::Base.configurations.configs_for(env_name: 'development').first.configuration_hash

    db_host = config[:host]
    db_user = config[:username]
    db_pass = config[:password]
    db_name = config[:database]

    puts "Connecting to MariaDB at #{db_host}..."

    # Connect to the server (not the DB yet, so we can DROP/CREATE)
    client = Mysql2::Client.new(
      host: db_host,
      username: db_user,
      password: db_pass
    )

    puts "Dropping and recreating database #{db_name}..."
    client.query("DROP DATABASE IF EXISTS `#{db_name}`")
    client.query("CREATE DATABASE `#{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    client.close

    # Now connect to the new DB
    client = Mysql2::Client.new(
      host: db_host,
      username: db_user,
      password: db_pass,
      database: db_name,
      flags: Mysql2::Client::MULTI_STATEMENTS
    )

    puts "Importing SQL from #{dump_file}..."
    sql = File.read(dump_file)
    begin
      client.query(sql)
    rescue Mysql2::Error => e
      puts "❌ Import failed: #{e.message}"
      exit 1
    end

    puts "✅ Database import complete!"
  end
end
